const express = require("express")
const { authenticateToken, requireRole } = require("../middleware/auth")
const { validateExercise } = require("../middleware/validation")
const db = require("../config/database")
const router = express.Router()


const path = require("path");
const fs = require("fs");
const multer = require("multer");
const crypto = require("crypto");

const isTruthy = (v) => ["1", "true", "on", "yes"].includes(String(v ?? "").toLowerCase());

// If this file is src/routes/exercises.js, go up twice to reach <projectRoot>/uploads
const UPLOAD_ROOT = path.join(__dirname, "..", "..", "uploads");
// Optional subfolder for exercises:
const EXERCISE_UPLOAD_DIR = path.join(UPLOAD_ROOT, "exercises");

fs.mkdirSync(EXERCISE_UPLOAD_DIR, { recursive: true });

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, EXERCISE_UPLOAD_DIR),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname || "");
    cb(null, crypto.randomBytes(16).toString("hex") + ext.toLowerCase());
  },
});

const upload = multer({ storage });


// GET /exercises - List exercises with filters
router.get("/", authenticateToken, async (req, res) => {
  try {
    const { muscle, search, page = 1, limit = 1000 } = req.query
    const offset = (page - 1) * limit

    let query = `
            SELECT e.*, u.name as author_name 
            FROM exercises e 
            LEFT JOIN users u ON e.author_id = u.id 
            WHERE 1=1
        `
    const params = []
    let paramCount = 0

    if (muscle) {
      paramCount++
      query += ` AND e.muscle = $${paramCount}`
      params.push(muscle)
    }

    if (search) {
      paramCount++
      query += ` AND e.name ILIKE $${paramCount}`
      params.push(`%${search}%`)
    }

    query += ` ORDER BY e.name ASC LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}`
    params.push(limit, offset)

    const result = await db.query(query, params)

    // Get total count
    let countQuery = "SELECT COUNT(*) FROM exercises e WHERE 1=1"
    const countParams = []
    let countParamCount = 0

    if (muscle) {
      countParamCount++
      countQuery += ` AND e.muscle = $${countParamCount}`
      countParams.push(muscle)
    }

    if (search) {
      countParamCount++
      countQuery += ` AND e.name ILIKE $${countParamCount}`
      countParams.push(`%${search}%`)
    }

    const countResult = await db.query(countQuery, countParams)
    const total = Number.parseInt(countResult.rows[0].count)



    const baseUrl = `${req.protocol}://${req.get("host")}`;

    function normalizeAssetPath(p, folder = "exercises") {
      if (!p) return null;
      // ако в БД е само filename => допълваме /uploads/<folder>/filename
      if (!p.startsWith("/uploads/")) {
        return `${baseUrl}/uploads/${folder}/${p}`;
      }
      // ако вече е /uploads/... => само добавяме host-а
      return `${baseUrl}${p}`;
    }
    
    const data = result.rows.map(r => ({
      ...r,
      image: normalizeAssetPath(r.image, "exercises"),
      video: normalizeAssetPath(r.video, "exercises"),
    }));


res.json({
  data,
  pagination: {
    page: Number.parseInt(page),
    limit: Number.parseInt(limit),
    total,
    pages: Math.ceil(total / limit),
  },
});

    // res.json({
    //   data: result.rows,
    //   pagination: {
    //     page: Number.parseInt(page),
    //     limit: Number.parseInt(limit),
    //     total,
    //     pages: Math.ceil(total / limit),
    //   },
    // })
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

// GET /exercises/:id - Get exercise detail
router.get("/:id", authenticateToken, async (req, res) => {
  try {
    const { id } = req.params

    const result = await db.query(
      `
            SELECT e.*, u.name as author_name 
            FROM exercises e 
            LEFT JOIN users u ON e.author_id = u.id 
            WHERE e.id = $1
        `,
      [id],
    )

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Exercise not found" })
    }

    res.json(result.rows[0])
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

// // POST /exercises - Create exercise (trainer or admin only)
// router.post("/", authenticateToken, requireRole(["trainer", "admin"]), validateExercise, async (req, res) => {
//   try {
//     const { name, muscle, image, video } = req.body
//     const authorId = req.user.id

//     const result = await db.query(
//       `
//             INSERT INTO exercises (name, muscle, image, video, author_id)
//             VALUES ($1, $2, $3, $4, $5)
//             RETURNING *
//         `,
//       [name, muscle, image, video, authorId],
//     )

//     res.status(201).json(result.rows[0])
//   } catch (error) {
//     res.status(500).json({ error: error.message })
//   }
// })

// // PUT /exercises/:id - Update exercise
// router.put("/:id", authenticateToken, requireRole(["trainer", "admin"]), validateExercise, async (req, res) => {
//   try {
//     const { id } = req.params
//     const { name, muscle, image, video } = req.body
//     const userId = req.user.id
//     const userRole = req.user.role

//     // Check if exercise exists and user has permission
//     const exerciseResult = await db.query("SELECT * FROM exercises WHERE id = $1", [id])
//     if (exerciseResult.rows.length === 0) {
//       return res.status(404).json({ error: "Exercise not found" })
//     }

//     const exercise = exerciseResult.rows[0]
//     if (userRole !== "admin" && exercise.author_id !== userId) {
//       return res.status(403).json({ error: "Not authorized to update this exercise" })
//     }

//     const result = await db.query(
//       `
//             UPDATE exercises 
//             SET name = $1, muscle = $2, image = $3, video = $4, updated_at = CURRENT_TIMESTAMP
//             WHERE id = $5
//             RETURNING *
//         `,
//       [name, muscle, image, video, id],
//     )

//     res.json(result.rows[0])
//   } catch (error) {
//     res.status(500).json({ error: error.message })
//   }
// })
router.post(
    "/",
    authenticateToken,
    requireRole(["trainer", "admin"]),
    // multer трябва да е преди валидатора, за да има req.body полета
    upload.fields([
      { name: "image", maxCount: 1 },
      { name: "video", maxCount: 1 },
    ]),
    validateExercise, // да изисква name и muscle, но image/video да са optional
    async (req, res) => {
      try {
        const { name, muscle } = req.body;
        const authorId = req.user.id;
  
        const imageFile = (req.files?.image || [])[0];
        const videoFile = (req.files?.video || [])[0];


        const imageUrl = imageFile ? `/uploads/exercises/${imageFile.filename}` : null;
        const videoUrl = videoFile ? `/uploads/exercises/${videoFile.filename}` : null;
  
        const result = await db.query(
          `
            INSERT INTO exercises (name, muscle, image, video, author_id)
            VALUES ($1, $2, $3, $4, $5)
            RETURNING *
          `,
          [name, muscle, imageUrl, videoUrl, authorId]
        );
  
        res.status(201).json(result.rows[0]);
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    }
  );
  
  // UPDATE
  // router.put(
  //   "/:id",
  //   authenticateToken,
  //   requireRole(["trainer", "admin"]),
  //   upload.fields([
  //     { name: "image", maxCount: 1 },
  //     { name: "video", maxCount: 1 },
  //   ]),
  //   // по избор: пак пусни validateExercise (но без да изисква файлове)
  //   async (req, res) => {
  //     try {
  //       const { id } = req.params;
  //       const { name, muscle } = req.body;
  
  //       const existing = await db.query(
  //         `SELECT id, image, video FROM exercises WHERE id = $1`,
  //         [id]
  //       );
  //       if (existing.rowCount === 0) {
  //         return res.status(404).json({ error: "Не е намерено упражнение" });
  //       }
  
  //       const current = existing.rows[0];
  //       const imageFile = (req.files?.image || [])[0];
  //       const videoFile = (req.files?.video || [])[0];
        
  //       const imageUrl = imageFile ? `/uploads/exercises/${imageFile.filename}` : current.image;
  //       const videoUrl = videoFile ? `/uploads/exercises/${videoFile.filename}` : current.video;
  
  //       const result = await db.query(
  //         `
  //           UPDATE exercises
  //           SET name = $1, muscle = $2, image = $3, video = $4
  //           WHERE id = $5
  //           RETURNING *
  //         `,
  //         [name, muscle, imageUrl, videoUrl, id]
  //       );
  
  //       res.json(result.rows[0]);
  //     } catch (error) {
  //       res.status(500).json({ error: error.message });
  //     }
  //   }
  // );
  router.put(
    "/:id",
    authenticateToken,
    requireRole(["trainer", "admin"]),
    upload.fields([
      { name: "image", maxCount: 1 },
      { name: "video", maxCount: 1 },
    ]),
    async (req, res) => {
      try {
        const { id } = req.params;
        const { name, muscle, image_remove, video_remove, video_url } = req.body;
  
        const existing = await db.query(
          `SELECT id, image, video FROM exercises WHERE id = $1`,
          [id]
        );
        if (existing.rowCount === 0) {
          return res.status(404).json({ error: "Не е намерено упражнение" });
        }
  
        const current = existing.rows[0];
        const imageFile = (req.files?.image || [])[0];
        const videoFile = (req.files?.video || [])[0];
  
        // ---- IMAGE resolve ----
        let newImage = current.image;
        if (isTruthy(image_remove)) {
          newImage = null;
  
          // (optional) delete the old file from disk if you store local files
          if (current.image && current.image.startsWith("/uploads/")) {
            try {
              // adjust base folder if needed (e.g. "./public" or where you serve uploads from)
              const abs = path.join(process.cwd(), "public", current.image);
              await fs.unlink(abs);
            } catch (_) {
              /* ignore if already gone */
            }
          }
        } else if (imageFile) {
          newImage = `/uploads/exercises/${imageFile.filename}`;
        }
        // else keep current
  
        // ---- VIDEO resolve ----
        let newVideo = current.video;
        if (isTruthy(video_remove)) {
          newVideo = null;
        } else if (videoFile) {
          newVideo = `/uploads/exercises/${videoFile.filename}`;
        } else if (typeof video_url === "string" && video_url.trim()) {
          newVideo = video_url.trim(); // support external links (YouTube/Vimeo/direct)
        }
        // else keep current
  
        const result = await db.query(
          `
            UPDATE exercises
            SET name = $1, muscle = $2, image = $3, video = $4
            WHERE id = $5
            RETURNING *
          `,
          [name, muscle, newImage, newVideo, id]
        );
  
        res.json(result.rows[0]);
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    }
  );

// DELETE /exercises/:id - Delete exercise
router.delete("/:id", authenticateToken, requireRole(["trainer", "admin"]), async (req, res) => {
  try {
    const { id } = req.params
    const userId = req.user.id
    const userRole = req.user.role

    // Check if exercise exists and user has permission
    const exerciseResult = await db.query("SELECT * FROM exercises WHERE id = $1", [id])
    if (exerciseResult.rows.length === 0) {
      return res.status(404).json({ error: "Exercise not found" })
    }

    const exercise = exerciseResult.rows[0]
    if (userRole !== "admin" && exercise.author_id !== userId) {
      return res.status(403).json({ error: "Not authorized to delete this exercise" })
    }

    await db.query("DELETE FROM exercises WHERE id = $1", [id])
    return res.status(200).json({ message: "Exercise deleted successfully"});
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

module.exports = router
