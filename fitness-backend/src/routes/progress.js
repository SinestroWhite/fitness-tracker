const express = require("express")
const multer = require("multer")
const path = require("path")
const fs = require("fs")
const { getDb } = require("../config/database")
const { authenticateToken, requireOwnershipOrRole } = require("../middleware/auth")
const { progressValidation, paginationValidation } = require("../middleware/validation")

const router = express.Router()

// Configure multer for image uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadPath = process.env.UPLOAD_PATH || "./uploads"
    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath, { recursive: true })
    }
    cb(null, uploadPath)
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9)
    cb(null, `progress-${uniqueSuffix}${path.extname(file.originalname)}`)
  },
})

const upload = multer({
  storage,
  limits: {
    fileSize: Number.parseInt(process.env.MAX_FILE_SIZE, 10) || 5 * 1024 * 1024, // 5MB
    files: 5,
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith("image/")) cb(null, true)
    else cb(new Error("Only image files are allowed"))
  },
})

// Helpers
const parsePagination = (query) => {
  const page = Math.max(1, parseInt(query.page ?? "1", 10))
  const pageSize = Math.min(100, Math.max(1, parseInt(query.pageSize ?? "20", 10)))
  let [field, order] = String(query.sort ?? "created_at:desc").split(":")
  // Whitelist to prevent SQL injection
  const allowedFields = new Set(["created_at", "weight_kg", "body_fat", "id"])
  const allowedOrder = new Set(["ASC", "DESC"])
  if (!allowedFields.has(field)) field = "created_at"
  order = (order || "DESC").toUpperCase()
  if (!allowedOrder.has(order)) order = "DESC"
  return { page, pageSize, sortField: field, sortOrder: order, offset: (page - 1) * pageSize }
}

// GET /progress/me
// router.get("/me", authenticateToken, paginationValidation, async (req, res) => {
//   const db = getDb()
//   const { page, pageSize, sortField, sortOrder, offset } = parsePagination(req.query)

//   try {
//     const countResult = await db.query(
//       "SELECT COUNT(*)::int AS total FROM progress WHERE \"user_id\" = $1",
//       [req.user.id],
//     )

//     const entriesResult = await db.query(
//       `
//       SELECT id, "weight_kg", "body_fat", images, "created_at"
//       FROM progress
//       WHERE "user_id" = $1
//       ORDER BY ${sortField === "created_at" ? `"created_at"` : sortField} ${sortOrder}
//       LIMIT $2 OFFSET $3
//       `,
//       [req.user.id, pageSize, offset],
//     )

//     const progressEntries = entriesResult.rows.map((row) => ({
//       ...row,
//       images: row.images || [],
//     }))

//     res.json({
//       progress: progressEntries,
//       pagination: {
//         page,
//         pageSize,
//         total: countResult.rows[0].total,
//         totalPages: Math.ceil(countResult.rows[0].total / pageSize),
//       },
//     })
//   } catch (err) {
//     console.error(err)
//     res.status(500).json({ error: "Failed to load progress" })
//   }
// })
router.get("/me", authenticateToken, paginationValidation, async (req, res) => {
  const db = getDb()

  // ---- Parse pagination (keep your helper, but we’ll fall back if needed)
  const { page, pageSize, sortField: pfSortField, sortOrder: pfSortOrder, offset } = parsePagination(req.query)

  // ---- Sort parsing: accept either "sort=field:dir" or sortField/sortOrder
  const rawSort = typeof req.query.sort === "string" ? req.query.sort : undefined
  let sortFieldRaw = pfSortField
  let sortOrderRaw = pfSortOrder

  if (rawSort) {
    const [f, d] = rawSort.split(":")
    if (f) sortFieldRaw = f
    if (d) sortOrderRaw = d
  } else {
    // also allow direct query keys ?sortField=createdAt&sortOrder=desc
    if (typeof req.query.sortField === "string") sortFieldRaw = req.query.sortField
    if (typeof req.query.sortOrder === "string") sortOrderRaw = req.query.sortOrder
  }

  // ---- Whitelist sortable fields & map camel->snake
  const fieldMap = {
    id: "id",
    createdAt: "created_at",
    created_at: "created_at",
    weightKg: "weight_kg",
    weight_kg: "weight_kg",
    bodyFat: "body_fat",
    body_fat: "body_fat",
  }
  const sortField = fieldMap[sortFieldRaw] ?? "created_at"
  const sortOrder = (String(sortOrderRaw || "desc").toUpperCase() === "ASC") ? "ASC" : "DESC"

  // ---- Date filters: accept dateFrom/dateTo (YYYY-MM-DD or ISO)
  const qFrom = typeof req.query.dateFrom === "string" ? req.query.dateFrom : undefined
  const qTo   = typeof req.query.dateTo === "string"   ? req.query.dateTo   : undefined

  // Normalize: if date-only, make it start/end of day; if ISO, use as-is
  const toStartOfDay = (d) => (d.includes("T") ? new Date(d) : new Date(`${d}T00:00:00.000Z`))
  const toEndOfDay   = (d) => (d.includes("T") ? new Date(d) : new Date(`${d}T23:59:59.999Z`))

  const dateFrom = qFrom ? toStartOfDay(qFrom) : undefined
  const dateTo   = qTo   ? toEndOfDay(qTo)     : undefined

  // ---- Build WHERE with parameterized placeholders
  const whereParts = [`"user_id" = $1`]
  const params = [req.user.id]
  let idx = 2

  if (dateFrom) {
    whereParts.push(`"created_at" >= $${idx++}`)
    params.push(dateFrom)
  }
  if (dateTo) {
    whereParts.push(`"created_at" <= $${idx++}`)
    params.push(dateTo)
  }

  const whereSql = `WHERE ${whereParts.join(" AND ")}`

  try {
    // ---- Count with same WHERE
    const countSql = `SELECT COUNT(*)::int AS total FROM progress ${whereSql}`
    const countResult = await db.query(countSql, params)
    const total = countResult.rows[0].total

    // ---- Data query with same WHERE; add LIMIT/OFFSET as last params
    const dataParams = [...params, pageSize, offset]
    const limitIdx = idx
    const offsetIdx = idx + 1

    const entriesSql = `
      SELECT id, "weight_kg", "body_fat", images, "created_at"
      FROM progress
      ${whereSql}
      ORDER BY "${sortField}" ${sortOrder}
      LIMIT $${limitIdx} OFFSET $${offsetIdx}
    `
    const entriesResult = await db.query(entriesSql, dataParams)

    const progressEntries = entriesResult.rows.map((row) => ({
      ...row,
      images: row.images || [],
    }))

    res.json({
      progress: progressEntries,
      pagination: {
        page,
        pageSize,
        total,
        totalPages: Math.ceil(total / pageSize),
      },
    })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: "Failed to load progress" })
  }
})


// POST /progress/me
router.post("/me", authenticateToken, upload.array("images", 5), progressValidation, async (req, res) => {
  const db = getDb()
  const { weightKg, bodyFat } = req.body

  const imagePaths = req.files ? req.files.map((f) => `/uploads/${f.filename}`) : []

  try {
    const insertResult = await db.query(
      `
      INSERT INTO progress ("user_id", "weight_kg", "body_fat", images)
      VALUES ($1, $2, $3, $4::jsonb)
      RETURNING id, "weight_kg", "body_fat", images, "created_at"
      `,
      [req.user.id, weightKg, bodyFat || null, JSON.stringify(imagePaths)],
    )

    const entry = insertResult.rows[0]
    res.status(201).json({
      progress: {
        ...entry,
        images: entry.images || [],
      },
    })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: "Failed to create progress entry" })
  }
})

// GET /progress/:userId (admin, trainer, or owner)
router.get(
  "/:userId",
  authenticateToken,
  requireOwnershipOrRole(["admin", "trainer"]),
  paginationValidation,
  async (req, res) => {
    const db = getDb()
    const userId = parseInt(req.params.userId, 10)
    const { page, pageSize, sortField, sortOrder, offset } = parsePagination(req.query)

    try {
      const countResult = await db.query(
        "SELECT COUNT(*)::int AS total FROM progress WHERE \"user_id\" = $1",
        [userId],
      )

      const entriesResult = await db.query(
        `
        SELECT id, "weight_kg", "body_fat", images, "created_at"
        FROM progress
        WHERE "user_id" = $1
        ORDER BY ${sortField === "created_at" ? `"created_at"` : sortField} ${sortOrder}
        LIMIT $2 OFFSET $3
        `,
        [userId, pageSize, offset],
      )

      const progressEntries = entriesResult.rows.map((row) => ({
        ...row,
        images: row.images || [],
      }))

      res.json({
        progress: progressEntries,
        pagination: {
          page,
          pageSize,
          total: countResult.rows[0].total,
          totalPages: Math.ceil(countResult.rows[0].total / pageSize),
        },
      })
    } catch (err) {
      console.error(err)
      res.status(500).json({ error: "Failed to load progress" })
    }
  },
)

// PUT /progress/:id (owner or admin)
router.put("/:id", authenticateToken, upload.array("images", 5), progressValidation, async (req, res) => {
  const db = getDb()
  const progressId = parseInt(req.params.id, 10)
  const { weightKg, bodyFat } = req.body

  try {
    // Ownership check
    const existing = await db.query('SELECT "user_id" FROM progress WHERE id = $1', [progressId])
    if (existing.rowCount === 0) return res.status(404).json({ error: "Progress entry not found" })

    const ownerId = existing.rows[0].user_id

    if (ownerId !== req.user.id && req.user.role !== "admin") {
      return res.status(403).json({ error: "Access denied" })
    }

    const imagePaths = req.files && req.files.length > 0 ? req.files.map((f) => `/uploads/${f.filename}`) : null

    const updates = []
    const params = []
    let idx = 1

    if (weightKg !== undefined) {
      updates.push(`"weight_kg" = $${idx++}`)
      params.push(weightKg)
    }
    if (bodyFat !== undefined) {
      updates.push(`"body_fat" = $${idx++}`)
      params.push(bodyFat)
    }
    // if (imagePaths) {
    //   updates.push(`images = $${idx++}::jsonb`)
    //   params.push(JSON.stringify(imagePaths))
    // }
    if (imagePaths) {
      // append new images to the existing array (or start from empty array)
      updates.push(`images = COALESCE(images, '[]'::jsonb) || $${idx++}::jsonb`)
      params.push(JSON.stringify(imagePaths))
    }

    if (updates.length === 0) return res.status(400).json({ error: "No valid updates provided" })

    params.push(progressId)

    const updateResult = await db.query(
      `
      UPDATE progress
      SET ${updates.join(", ")}
      WHERE id = $${idx}
      RETURNING id, "weight_kg", "body_fat", images, "created_at"
      `,
      params,
    )

    const updated = updateResult.rows[0]
    res.json({
      progress: {
        ...updated,
        images: updated.images || [],
      },
    })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: "Failed to update progress entry" })
  }
})

// DELETE /progress/:id (owner or admin)
router.delete("/:id", authenticateToken, async (req, res) => {
  const db = getDb()
  const progressId = parseInt(req.params.id, 10)

  try {
    const existing = await db.query(
      'SELECT "user_id", images FROM progress WHERE id = $1',
      [progressId],
    )
    if (existing.rowCount === 0) return res.status(404).json({ error: "Progress entry not found" })

    const row = existing.rows[0]
    if (row.user_id !== req.user.id && req.user.role !== "admin") {
      return res.status(403).json({ error: "Access denied" })
    }

    await db.query("DELETE FROM progress WHERE id = $1", [progressId])

    // Clean up image files (best-effort)
    if (row.images && Array.isArray(row.images)) {
      row.images.forEach((imagePath) => {
        const fullPath = path.join(__dirname, "..", "..", imagePath)
        fs.unlink(fullPath, (err) => {
          if (err) console.error("Failed to delete image:", err)
        })
      })
    }

    res.json({ message: "Progress entry deleted successfully" })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: "Failed to delete progress entry" })
  }
})

// add near the top, next to multer config:
const UPLOAD_ROOT = path.resolve(process.env.UPLOAD_PATH || "./uploads");

// DELETE /progress/:id/images  (owner or admin) — deletes a single image
router.delete("/:id/images", authenticateToken, async (req, res) => {
  const db = getDb();
  const progressId = parseInt(req.params.id, 10);

  // Accept image in body { image } or as query ?image=
  const raw = ((req.body && req.body.image) || req.query?.image || "").toString().trim();
  if (!raw) return res.status(400).json({ error: "Missing 'image' to delete" });

  // Normalize input to stored path like "/uploads/filename.ext"
  let imagePath = raw;
  try {
    if (/^https?:\/\//i.test(raw)) {
      const u = new URL(raw);
      imagePath = u.pathname; // "/uploads/filename.png"
    }
  } catch (_) { /* not a URL; ignore */ }

  if (!imagePath.startsWith("/uploads/")) {
    // allow passing just a filename
    imagePath = `/uploads/${path.basename(imagePath)}`;
  }

  try {
    // Ownership + get current images
    const existing = await db.query('SELECT "user_id", images FROM progress WHERE id = $1', [progressId]);
    if (existing.rowCount === 0) return res.status(404).json({ error: "Progress entry not found" });

    const row = existing.rows[0];
    if (row.user_id !== req.user.id && req.user.role !== "admin") {
      return res.status(403).json({ error: "Access denied" });
    }

    const before = Array.isArray(row.images) ? row.images : [];
    const wasInArray = before.includes(imagePath);

    // Remove from JSONB array atomically
    const updateSql = `
      UPDATE progress
      SET images = COALESCE(
        (SELECT jsonb_agg(elem)
         FROM jsonb_array_elements(images) elem
         WHERE elem <> to_jsonb($1::text)
        ),
        '[]'::jsonb
      )
      WHERE id = $2
      RETURNING id, "weight_kg", "body_fat", images, "created_at"
    `;
    const { rows } = await db.query(updateSql, [imagePath, progressId]);
    const updated = rows[0];

    // Best-effort: delete file from disk if it existed in DB
    if (wasInArray) {
      const filename = path.basename(imagePath);
      const fileOnDisk = path.join(UPLOAD_ROOT, filename);
      fs.promises.unlink(fileOnDisk).catch((e) => {
        if (e.code !== "ENOENT") console.error("Failed to delete image file:", e);
      });
    }

    return res.json({
      progress: {
        ...updated,
        images: updated.images || [],
      },
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Failed to delete image" });
  }
});



module.exports = router
