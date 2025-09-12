const express = require("express")
const multer = require("multer")
const path = require("path")
const fs = require("fs")
const { authenticateToken, requireRole } = require("../middleware/auth")
const db = require("../config/database")
const router = express.Router()


const uploadDir = path.join(process.cwd(), "uploads", "meals")
fs.mkdirSync(uploadDir, { recursive: true })

// конфигурация на multer
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadDir),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname)
    cb(null, `${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`)
  },
})

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
})

// GET /meals - List meals
// router.get("/", authenticateToken, async (req, res) => {
//   try {
//     const {
//       kcalMin,
//       kcalMax,
//       proteinMin,
//       proteinMax,
//       carbsMin,
//       carbsMax,
//       fatMin,
//       fatMax,
//       search,
//       page = 1,
//       limit = 10,
//     } = req.query

//     const offset = (page - 1) * limit

//     let query = "SELECT * FROM meals WHERE 1=1"
//     const params = []
//     let paramCount = 0

//     // Calorie filters
//     if (kcalMin) {
//       paramCount++
//       query += ` AND calories >= $${paramCount}`
//       params.push(Number.parseFloat(kcalMin))
//     }
//     if (kcalMax) {
//       paramCount++
//       query += ` AND calories <= $${paramCount}`
//       params.push(Number.parseFloat(kcalMax))
//     }

//     // Protein filters
//     if (proteinMin) {
//       paramCount++
//       query += ` AND protein >= $${paramCount}`
//       params.push(Number.parseFloat(proteinMin))
//     }
//     if (proteinMax) {
//       paramCount++
//       query += ` AND protein <= $${paramCount}`
//       params.push(Number.parseFloat(proteinMax))
//     }

//     // Carbohydrate filters
//     if (carbsMin) {
//       paramCount++
//       query += ` AND carbohydrates >= $${paramCount}`
//       params.push(Number.parseFloat(carbsMin))
//     }
//     if (carbsMax) {
//       paramCount++
//       query += ` AND carbohydrates <= $${paramCount}`
//       params.push(Number.parseFloat(carbsMax))
//     }

//     // Fat filters
//     if (fatMin) {
//       paramCount++
//       query += ` AND fat >= $${paramCount}`
//       params.push(Number.parseFloat(fatMin))
//     }
//     if (fatMax) {
//       paramCount++
//       query += ` AND fat <= $${paramCount}`
//       params.push(Number.parseFloat(fatMax))
//     }

//     // Search filter
//     if (search) {
//       paramCount++
//       query += ` AND (title ILIKE $${paramCount} OR description ILIKE $${paramCount})`
//       params.push(`%${search}%`)
//     }

//     query += " ORDER BY title"

//     paramCount++
//     query += ` LIMIT $${paramCount}`
//     params.push(limit)

//     paramCount++
//     query += ` OFFSET $${paramCount}`
//     params.push(offset)

//     const result = await db.query(query, params)

//     res.json({
//       data: result.rows,
//       pagination: {
//         page: Number.parseInt(page),
//         limit: Number.parseInt(limit),
//         total: result.rows.length,
//       },
//     })
//   } catch (error) {
//     console.error("Error fetching meals:", error)
//     res.status(500).json({ error: "Internal server error" })
//   }
// })
router.get("/", authenticateToken, async (req, res) => {
  try {
    const q = req.query;

    // Parse pagination safely (accept `limit` or `pageSize`)
    const page = Math.max(parseInt((q.page ?? "1"), 10) || 1, 1);
    const limit = Math.max(
      parseInt((q.limit ?? q.pageSize ?? "1000"), 10) || 10,
      1
    );
    const offset = (page - 1) * limit;

    // Helper: parse numeric filters; keep undefined if empty
    const num = (v) =>
      v === undefined || v === null || v === "" ? undefined : Number(v);

    const kcalMin = num(q.kcalMin);
    const kcalMax = num(q.kcalMax);
    const proteinMin = num(q.proteinMin);
    const proteinMax = num(q.proteinMax);
    const carbsMin = num(q.carbsMin);
    const carbsMax = num(q.carbsMax);
    const fatMin = num(q.fatMin);
    const fatMax = num(q.fatMax);

    let sql = `
      SELECT m.*, COUNT(*) OVER() AS total_count
      FROM meals m
      WHERE 1=1
    `;
    const params = [];

    // Numeric filters
    if (kcalMin !== undefined) { params.push(kcalMin); sql += ` AND m.calories >= $${params.length}`; }
    if (kcalMax !== undefined) { params.push(kcalMax); sql += ` AND m.calories <= $${params.length}`; }

    if (proteinMin !== undefined) { params.push(proteinMin); sql += ` AND m.protein >= $${params.length}`; }
    if (proteinMax !== undefined) { params.push(proteinMax); sql += ` AND m.protein <= $${params.length}`; }

    if (carbsMin !== undefined) { params.push(carbsMin); sql += ` AND m.carbohydrates >= $${params.length}`; }
    if (carbsMax !== undefined) { params.push(carbsMax); sql += ` AND m.carbohydrates <= $${params.length}`; }

    if (fatMin !== undefined) { params.push(fatMin); sql += ` AND m.fat >= $${params.length}`; }
    if (fatMax !== undefined) { params.push(fatMax); sql += ` AND m.fat <= $${params.length}`; }

    // Search (null-safe on description)
    const search = (q.search ?? "").toString().trim();
    if (search) {
      params.push(`%${search}%`);
      const p = params.length;
      sql += ` AND (m.title ILIKE $${p} OR COALESCE(m.description, '') ILIKE $${p})`;
    }

    // Order + pagination (cast to int to be explicit)
    sql += ` ORDER BY m.title ASC`;
    params.push(limit);
    sql += ` LIMIT $${params.length}::int`;
    params.push(offset);
    sql += ` OFFSET $${params.length}::int`;

    const result = await db.query(sql, params);
    const rows = result.rows;
    const total = rows.length ? Number(rows[0].total_count) : 0;

    // Strip window column from payload
    const data = rows.map(({ total_count, ...r }) => r);

    res.json({
      data,
      pagination: {
        page,
        limit,
        total,
      },
    });
  } catch (error) {
    console.error("Error fetching meals:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// GET /meals/:id - Get meal by ID
router.get("/:id", authenticateToken, async (req, res) => {
  try {
    const { id } = req.params

    const result = await db.query("SELECT * FROM meals WHERE id = $1", [id])

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Meal not found" })
    }

    res.json(result.rows[0])
  } catch (error) {
    console.error("Error fetching meal:", error)
    res.status(500).json({ error: "Internal server error" })
  }
})


router.post(
  "/",
  authenticateToken,
  requireRole(["trainer", "admin"]),
  upload.single("image"), // 🔑 очакваме поле с име "image"
  async (req, res) => {
    try {
      // при multipart стойностите са string-ове -> парсваме числата
      const title = req.body.title?.trim()
      const description = req.body.description?.trim() || null
      const calories = Number.parseInt(req.body.calories, 10)
      const protein = Number.parseFloat(req.body.protein)
      const carbohydrates = Number.parseFloat(req.body.carbohydrates)
      const fat = Number.parseFloat(req.body.fat)

      // ако има файл -> пазим относителен път, иначе приемаме, че може да дойде image URL в body
      const image = req.file
        ? `/uploads/meals/${req.file.filename}`
        : req.body.image?.trim() || null

      if (
        !title ||
        Number.isNaN(calories) ||
        Number.isNaN(protein) ||
        Number.isNaN(carbohydrates) ||
        Number.isNaN(fat)
      ) {
        return res.status(400).json({ error: "Missing or invalid fields" })
      }

      const query = `
        INSERT INTO meals (title, image, description, calories, protein, carbohydrates, fat)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        RETURNING *
      `
      const result = await db.query(query, [
        title,
        image,
        description,
        calories,
        protein,
        carbohydrates,
        fat,
      ])

      return res.status(201).json(result.rows[0])
    } catch (error) {
      console.error("Error creating meal:", error)
      return res.status(500).json({ error: "Internal server error" })
    }
  }
)

// PUT /meals/:id - Update meal
// router.put("/:id", authenticateToken, requireRole(["trainer", "admin"]), async (req, res) => {
//   try {
//     const { id } = req.params
//     const { title, image, description, calories, protein, carbohydrates, fat } = req.body

//     // Check if meal exists
//     const checkResult = await db.query("SELECT * FROM meals WHERE id = $1", [id])
//     if (checkResult.rows.length === 0) {
//       return res.status(404).json({ error: "Meal not found" })
//     }

//     const query = `
//       UPDATE meals 
//       SET title = $1, image = $2, description = $3, calories = $4, protein = $5, carbohydrates = $6, fat = $7
//       WHERE id = $8
//       RETURNING *
//     `

//     const result = await db.query(query, [title, image, description, calories, protein, carbohydrates, fat, id])
//     res.json(result.rows[0])
//   } catch (error) {
//     console.error("Error updating meal:", error)
//     res.status(500).json({ error: "Internal server error" })
//   }
// })
router.put("/:id",
  authenticateToken,
  requireRole(["trainer","admin"]),
  upload.single("image"),                 // <-- IMPORTANT
  async (req, res) => {
    try {
      const { id } = req.params
      const found = await db.query("SELECT * FROM meals WHERE id=$1", [id])
      if (!found.rows.length) return res.status(404).json({ error: "Meal not found" })
      const current = found.rows[0]

      const b = req.body
      const removeImage = b.removeImage === "true"
      const newImagePath = req.file ? `/uploads/meals/${req.file.filename}` : undefined

      // If a field is absent, keep the current value (so PUT behaves like PATCH here)
      const title = b.title ?? current.title
      const description = b.description ?? current.description
      const calories = b.calories !== undefined ? Number(b.calories) : current.calories
      const protein = b.protein !== undefined ? Number(b.protein) : current.protein
      const carbohydrates = b.carbohydrates !== undefined ? Number(b.carbohydrates) : current.carbohydrates
      const fat = b.fat !== undefined ? Number(b.fat) : current.fat

      const image =
        removeImage ? null :
        newImagePath !== undefined ? newImagePath :
        current.image

      const q = `
        UPDATE meals SET
          title=$1, image=$2, description=$3, calories=$4, protein=$5, carbohydrates=$6, fat=$7
        WHERE id=$8
        RETURNING *`
      const result = await db.query(q, [title, image, description, calories, protein, carbohydrates, fat, id])
      res.json(result.rows[0])
    } catch (e) {
      console.error("Error updating meal:", e)
      res.status(500).json({ error: "Internal server error" })
    }
  }
)

// DELETE /meals/:id - Delete meal
router.delete("/:id", authenticateToken, requireRole(["trainer", "admin"]), async (req, res) => {
  try {
    const { id } = req.params

    // Check if meal exists
    const checkResult = await db.query("SELECT * FROM meals WHERE id = $1", [id])
    if (checkResult.rows.length === 0) {
      return res.status(404).json({ error: "Meal not found" })
    }

    await db.query("DELETE FROM meals WHERE id = $1", [id])
    res.status(204).send()
  } catch (error) {
    console.error("Error deleting meal:", error)
    res.status(500).json({ error: "Internal server error" })
  }
})

module.exports = router
