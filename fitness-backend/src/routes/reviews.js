const express = require("express")
const { authenticateToken } = require("../middleware/auth")
const db = require("../config/database")
const router = express.Router()

const path = require("path");
const fs = require("fs");
const multer = require("multer");

// Resolve the uploads dir to EXACTLY match app.js:
// app.js: path.join(__dirname, "..", "uploads")
const ENTRY_DIR = path.dirname(require.main?.filename || process.cwd());
const STATIC_UPLOADS_DIR = process.env.UPLOAD_PATH
  ? path.resolve(process.env.UPLOAD_PATH)
  : path.resolve(ENTRY_DIR, "..", "uploads");

// (optional) debug once
if (!fs.existsSync(STATIC_UPLOADS_DIR)) {
  fs.mkdirSync(STATIC_UPLOADS_DIR, { recursive: true });
  console.log("Created uploads dir:", STATIC_UPLOADS_DIR);
} else {
  console.log("Using uploads dir:", STATIC_UPLOADS_DIR);
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, STATIC_UPLOADS_DIR),
  filename: (_req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, `review-${uniqueSuffix}${path.extname(file.originalname)}`);
  },
});

const upload = multer({
  storage,
  limits: {
    fileSize: Number.parseInt(process.env.MAX_FILE_SIZE ?? "", 10) || 5 * 1024 * 1024,
    files: 5,
  },
  fileFilter: (_req, file, cb) => {
    if (file.mimetype?.startsWith("image/")) cb(null, true);
    else cb(new Error("Only image files are allowed"));
  },
});

// GET /trainers/:trainerId/reviews - List reviews for a trainer
router.get("/trainers/:trainerId/reviews", async (req, res) => {
    try {
      const { trainerId } = req.params;
      const {
        page = "1",
        limit = "10",
        ratingMin,
        ratingMax,
        sortBy = "created_at",
        sortOrder = "desc",
      } = req.query;
  
      // Parse & validate numbers
      const trainerIdNum = Number.parseInt(String(trainerId), 10);
      const pageNum = Number.parseInt(String(page), 10);
      const limitNum = Number.parseInt(String(limit), 10);
      const ratingMinNum = ratingMin !== undefined ? Number.parseInt(String(ratingMin), 10) : undefined;
      const ratingMaxNum = ratingMax !== undefined ? Number.parseInt(String(ratingMax), 10) : undefined;
  
      if (!Number.isInteger(trainerIdNum)) return res.status(400).json({ error: "Invalid trainerId" });
      if (!Number.isInteger(pageNum) || pageNum < 1) return res.status(400).json({ error: "Invalid page" });
      if (!Number.isInteger(limitNum) || limitNum < 1 || limitNum > 100)
        return res.status(400).json({ error: "Invalid limit (1–100)" });
      if (ratingMinNum !== undefined && (!Number.isInteger(ratingMinNum) || ratingMinNum < 1 || ratingMinNum > 5))
        return res.status(400).json({ error: "ratingMin must be 1–5" });
      if (ratingMaxNum !== undefined && (!Number.isInteger(ratingMaxNum) || ratingMaxNum < 1 || ratingMaxNum > 5))
        return res.status(400).json({ error: "ratingMax must be 1–5" });
      if (ratingMinNum !== undefined && ratingMaxNum !== undefined && ratingMinNum > ratingMaxNum)
        return res.status(400).json({ error: "ratingMin cannot be greater than ratingMax" });
  
      const offsetNum = (pageNum - 1) * limitNum;
  
      // Verify trainer exists and has trainer role
      const trainerCheck = await db.query(
        `SELECT id FROM users WHERE id = $1::int AND role = 'trainer'`,
        [trainerIdNum]
      );
      if (trainerCheck.rows.length === 0) {
        return res.status(404).json({ error: "Trainer not found" });
      }
  
      // Build filters
      const filters = [`r.trainer_id = $1::int`];
      const params = [trainerIdNum];
  
      if (ratingMinNum !== undefined) {
        params.push(ratingMinNum);
        filters.push(`r.rating >= $${params.length}::int`);
      }
      if (ratingMaxNum !== undefined) {
        params.push(ratingMaxNum);
        filters.push(`r.rating <= $${params.length}::int`);
      }
  
      const whereClause = `WHERE ${filters.join(" AND ")}`;
  
      // Whitelist sort
      const sortFieldMap = { created_at: "created_at", rating: "rating" };
      const sortField = sortFieldMap[String(sortBy)] || "created_at";
      const sortDirection = String(sortOrder).toLowerCase() === "asc" ? "ASC" : "DESC";
  
      // Reviews + count (use a separate COUNT to keep it simple)
      const reviewsSql = `
  SELECT 
    r.id, r.user_id, r.trainer_id, r.rating, r.text, r.images, r.created_at,
    u.name AS name,
    u.email
  FROM reviews r
  JOIN users u ON r.user_id = u.id
  ${whereClause}
  ORDER BY r.${sortField} ${sortDirection}
  LIMIT $${params.length + 1}::int OFFSET $${params.length + 2}::int
`;

      const reviewsParams = [...params, limitNum, offsetNum];
      const reviews = await db.query(reviewsSql, reviewsParams);
  
      const countSql = `
        SELECT COUNT(*)::int AS total
        FROM reviews r
        ${whereClause}
      `;
      const countResult = await db.query(countSql, params);
      const total = countResult.rows[0]?.total ?? 0;
  
      // Overall stats for the trainer (unfiltered, as in your original)
      const statsSql = `
        SELECT COALESCE(AVG(rating), 0)::numeric(3,2) AS average_rating,
               COUNT(*)::int AS total_reviews
        FROM reviews
        WHERE trainer_id = $1::int
      `;
      const statsResult = await db.query(statsSql, [trainerIdNum]);
      const stats = statsResult.rows[0];
  
      res.json({
        reviews: reviews.rows,
        pagination: {
          page: pageNum,
          limit: limitNum,
          total,
          pages: Math.ceil(total / limitNum),
        },
        stats: {
          average_rating: Number(stats.average_rating),
          total_reviews: stats.total_reviews,
        },
      });
    } catch (error) {
      console.error("Error fetching trainer reviews:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });
  


// POST /trainers/:trainerId/reviews - Create a review (users only)
// router.post("/trainers/:trainerId/reviews", authenticateToken, (req, res) => {
//     // приемаме images, images[] и image
//     const uploader = upload.fields([
//       { name: "images", maxCount: 5 },
//       { name: "images[]", maxCount: 5 },
//       { name: "image", maxCount: 5 },
//     ]);
  
//     uploader(req, res, async (err) => {
//       if (err) return res.status(400).json({ error: err.message || "Upload failed" });
  
//       try {
//         // по желание: бърза защита – трябва да е multipart
//         if (!req.is("multipart/form-data")) {
//           return res.status(415).json({ error: "Send multipart/form-data with field 'images'." });
//         }
  
//         const trainerIdNum = Number.parseInt(String(req.params.trainerId), 10);
//         if (!Number.isInteger(trainerIdNum)) {
//           return res.status(400).json({ error: "Invalid trainerId" });
//         }
  
//         const userIdNum = Number(req.user.id);
//         let ratingNum = Math.trunc(Number(req.body.rating));
//         if (!Number.isFinite(ratingNum) || ratingNum < 1 || ratingNum > 5) {
//           return res.status(400).json({ error: "rating must be an integer between 1 and 5" });
//         }
  
//         const text = typeof req.body.text === "string" ? req.body.text : "";
  
//         // съберем всички възможни полета с файлове
//         const uploaded =
//           [
//             ...(req.files?.images || []),
//             ...(req.files?.["images[]"] || []),
//             ...(req.files?.image || []),
//           ] || [];
  
//         const images = uploaded.map((f) => `/uploads/${f.filename}`);
  
//         // (по избор) ако очакваш поне 1 снимка:
//         // if (images.length === 0) return res.status(400).json({ error: "No image files received" });
  
//         // Verify trainer exists and has trainer role
//         const trainerCheck = await db.query(
//           `SELECT id FROM users WHERE id = $1::int AND role = 'trainer'`,
//           [trainerIdNum]
//         );
//         if (trainerCheck.rows.length === 0) {
//           return res.status(404).json({ error: "Trainer not found" });
//         }
  
//         if (userIdNum === trainerIdNum) {
//           return res.status(400).json({ error: "Cannot review yourself" });
//         }
  
//         const exists = await db.query(
//           `SELECT id FROM reviews WHERE user_id = $1::int AND trainer_id = $2::int`,
//           [userIdNum, trainerIdNum]
//         );
//         if (exists.rows.length > 0) {
//           return res.status(400).json({ error: "You have already reviewed this trainer" });
//         }
  
//         const result = await db.query(
//           `INSERT INTO reviews (user_id, trainer_id, rating, text, images)
//            VALUES ($1::int, $2::int, $3::int, $4::text, $5::jsonb)
//            RETURNING *`,
//           [userIdNum, trainerIdNum, ratingNum, text, JSON.stringify(images)]
//         );
  
//         return res.status(201).json({
//           message: "Review created successfully",
//           review: result.rows[0],
//         });
//       } catch (error) {
//         console.error("Error creating review:", error);
//         if (error && error.constraint === "unique_user_trainer_review") {
//           return res.status(400).json({ error: "You have already reviewed this trainer" });
//         }
//         return res.status(500).json({ error: "Internal server error" });
//       }
//     });
//  });
router.post("/trainers/:trainerId/reviews", authenticateToken, (req, res) => {
  const uploader = upload.fields([
    { name: "images", maxCount: 5 },
    { name: "images[]", maxCount: 5 },
    { name: "image", maxCount: 5 },
  ]);

  const createReview = async (req, res, uploadedFiles = []) => {
    try {
      const trainerIdNum = Number.parseInt(String(req.params.trainerId), 10);
      if (!Number.isInteger(trainerIdNum)) {
        return res.status(400).json({ error: "Invalid trainerId" });
      }

      const userIdNum = Number(req.user.id);
      const ratingRaw = Number(req.body.rating);
      // ако искаш само цели числа 1..5, не ги “trunc”-вай, а валидирай директно:
      if (!Number.isInteger(ratingRaw) || ratingRaw < 1 || ratingRaw > 5) {
        return res.status(400).json({ error: "rating must be an integer between 1 and 5" });
      }
      const ratingNum = ratingRaw;

      const text = typeof req.body.text === "string" ? req.body.text.trim() : "";

      const images = (uploadedFiles || []).map((f) =>
        typeof f === "string" ? f : `/uploads/${f.filename}`
      );

      // Verify trainer exists and has trainer role
      const trainerCheck = await db.query(
        `SELECT id FROM users WHERE id = $1::int AND role = 'trainer'`,
        [trainerIdNum]
      );
      if (trainerCheck.rows.length === 0) {
        return res.status(404).json({ error: "Trainer not found" });
      }

      if (userIdNum === trainerIdNum) {
        return res.status(400).json({ error: "Cannot review yourself" });
      }

      const exists = await db.query(
        `SELECT id FROM reviews WHERE user_id = $1::int AND trainer_id = $2::int`,
        [userIdNum, trainerIdNum]
      );
      if (exists.rows.length > 0) {
        return res.status(400).json({ error: "You have already reviewed this trainer" });
      }

      const result = await db.query(
        `INSERT INTO reviews (user_id, trainer_id, rating, text, images)
         VALUES ($1::int, $2::int, $3::int, $4::text, $5::jsonb)
         RETURNING *`,
        [userIdNum, trainerIdNum, ratingNum, text, JSON.stringify(images)]
      );

      return res.status(201).json({
        message: "Review created successfully",
        review: result.rows[0],
      });
    } catch (error) {
      console.error("Error creating review:", error);
      if (error && error.constraint === "unique_user_trainer_review") {
        return res.status(400).json({ error: "You have already reviewed this trainer" });
      }
      return res.status(500).json({ error: "Internal server error" });
    }
  };

  const isMultipart = !!req.is("multipart/form-data");
  const isJsonOrForm =
    !!req.is("application/json") || !!req.is("application/x-www-form-urlencoded");

  // ако не е multipart и не е json/urlencoded → 415
  if (!isMultipart && !isJsonOrForm) {
    return res
      .status(415)
      .json({ error: "Send multipart/form-data for images or JSON/x-www-form-urlencoded without images." });
  }

  if (isMultipart) {
    uploader(req, res, async (err) => {
      if (err) return res.status(400).json({ error: err.message || "Upload failed" });

      const uploaded = [
        ...(req.files?.images || []),
        ...(req.files?.["images[]"] || []),
        ...(req.files?.image || []),
      ];
      return createReview(req, res, uploaded);
    });
  } else {
    // без файлове (JSON или urlencoded)
    return createReview(req, res, []);
  }
});

  

// PUT /reviews/:id - Update own review (owner, trainer, or admin)
router.put("/reviews/:id", authenticateToken, upload.array("images", 5), async (req, res) => {
  try {
    const { id } = req.params
    const { rating, text } = req.body
    const userId = req.user.id
    const userRole = req.user.role

    // Get existing review
    const existingReview = await db.query("SELECT * FROM reviews WHERE id = $1", [id])

    if (existingReview.rows.length === 0) {
      return res.status(404).json({ error: "Review not found" })
    }

    const review = existingReview.rows[0]

    // Check permissions (owner, trainer being reviewed, or admin)
    if (review.user_id !== userId && review.trainer_id !== userId && userRole !== "admin") {
      return res.status(403).json({ error: "Access denied" })
    }

    // Process uploaded images
    let images = review.images
    if (req.files && req.files.length > 0) {
      images = req.files.map((file) => `/uploads/${file.filename}`)
    }

    // Update review
    const result = await db.query(
      `UPDATE reviews 
         SET rating = COALESCE($1, rating), 
             text = COALESCE($2, text), 
             images = COALESCE($3, images),
             updated_at = CURRENT_TIMESTAMP
         WHERE id = $4
         RETURNING *`,
      [rating, text, JSON.stringify(images), id],
    )

    res.json({
      message: "Review updated successfully",
      review: result.rows[0],
    })
  } catch (error) {
    console.error("Error updating review:", error)
    res.status(500).json({ error: "Internal server error" })
  }
})

// DELETE /reviews/:id - Delete review (owner, trainer, or admin)
router.delete("/reviews/:id", authenticateToken, async (req, res) => {
  try {
    const { id } = req.params
    const userId = req.user.id
    const userRole = req.user.role

    // Get existing review
    const existingReview = await db.query("SELECT * FROM reviews WHERE id = $1", [id])

    if (existingReview.rows.length === 0) {
      return res.status(404).json({ error: "Review not found" })
    }

    const review = existingReview.rows[0]

    // Check permissions (owner, trainer being reviewed, or admin)
    if (review.user_id !== userId && review.trainer_id !== userId && userRole !== "admin") {
      return res.status(403).json({ error: "Access denied" })
    }

    // Delete review
    await db.query("DELETE FROM reviews WHERE id = $1", [id])

    res.json({ message: "Review deleted successfully" })
  } catch (error) {
    console.error("Error deleting review:", error)
    res.status(500).json({ error: "Internal server error" })
  }
})

// GET /reviews/me - List current user's reviews
router.get("/reviews/me", authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id
    const { page = 1, limit = 10, sortBy = "created_at", sortOrder = "desc" } = req.query

    // Validate sort parameters
    const validSortFields = ["created_at", "rating"]
    const validSortOrders = ["asc", "desc"]

    const sortField = validSortFields.includes(sortBy) ? sortBy : "created_at"
    const sortDirection = validSortOrders.includes(sortOrder.toLowerCase()) ? sortOrder.toUpperCase() : "DESC"

    const offset = (page - 1) * limit

    // Get user's reviews with trainer information
    const reviewsQuery = `
      SELECT 
        r.id,
        r.user_id,
        r.trainer_id,
        r.rating,
        r.text,
        r.images,
        r.created_at,
        t.name AS trainer_name,
        t.email as trainer_email
      FROM reviews r
      JOIN users t ON r.trainer_id = t.id
      WHERE r.user_id = $1
      ORDER BY r.${sortField} ${sortDirection}
      LIMIT $2 OFFSET $3
    `

    const reviews = await db.query(reviewsQuery, [userId, limit, offset])

    // Get total count
    const countResult = await db.query("SELECT COUNT(*) as total FROM reviews WHERE user_id = $1", [userId])
    const total = Number.parseInt(countResult.rows[0].total)

    res.json({
      reviews: reviews.rows,
      pagination: {
        page: Number.parseInt(page),
        limit: Number.parseInt(limit),
        total,
        pages: Math.ceil(total / limit),
      },
    })
  } catch (error) {
    console.error("Error fetching user reviews:", error)
    res.status(500).json({ error: "Internal server error" })
  }
})

module.exports = router
