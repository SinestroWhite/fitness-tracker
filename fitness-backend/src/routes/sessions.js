const express = require("express")
const { authenticateToken, requireRole } = require("../middleware/auth")
const { validateSession } = require("../middleware/validation")
const db = require("../config/database")
const router = express.Router()

// GET /sessions - List sessions with filters
router.get("/", authenticateToken, async (req, res) => {
  try {
    const { bodyArea, durationMin, durationMax, authorId, search, page = 1, limit = 10 } = req.query
    const offset = (page - 1) * limit

    let query = `
            SELECT s.*, u.name as author_name 
            FROM sessions s 
            LEFT JOIN users u ON s.author_id = u.id 
            WHERE 1=1
        `
    const params = []
    let paramCount = 0

    if (bodyArea) {
      paramCount++
      query += ` AND s.body_area = $${paramCount}`
      params.push(bodyArea)
    }

    if (durationMin) {
      paramCount++
      query += ` AND s.duration_mins >= $${paramCount}`
      params.push(Number.parseInt(durationMin))
    }

    if (durationMax) {
      paramCount++
      query += ` AND s.duration_mins <= $${paramCount}`
      params.push(Number.parseInt(durationMax))
    }

    if (authorId) {
      paramCount++
      query += ` AND s.author_id = $${paramCount}`
      params.push(authorId)
    }

    if (search) {
      paramCount++
      query += ` AND (s.title ILIKE $${paramCount} OR s.description ILIKE $${paramCount})`
      params.push(`%${search}%`)
    }

    query += ` ORDER BY s.created_at DESC LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}`
    params.push(limit, offset)

    const result = await db.query(query, params)

    // Get total count
    let countQuery = "SELECT COUNT(*) FROM sessions s WHERE 1=1"
    const countParams = []
    let countParamCount = 0

    if (bodyArea) {
      countParamCount++
      countQuery += ` AND s.body_area = $${countParamCount}`
      countParams.push(bodyArea)
    }

    if (durationMin) {
      countParamCount++
      countQuery += ` AND s.duration_mins >= $${countParamCount}`
      countParams.push(Number.parseInt(durationMin))
    }

    if (durationMax) {
      countParamCount++
      countQuery += ` AND s.duration_mins <= $${countParamCount}`
      countParams.push(Number.parseInt(durationMax))
    }

    if (authorId) {
      countParamCount++
      countQuery += ` AND s.author_id = $${countParamCount}`
      countParams.push(authorId)
    }

    if (search) {
      countParamCount++
      countQuery += ` AND (s.title ILIKE $${countParamCount} OR s.description ILIKE $${countParamCount})`
      countParams.push(`%${search}%`)
    }

    const countResult = await db.query(countQuery, countParams)
    const total = Number.parseInt(countResult.rows[0].count)

    res.json({
      data: result.rows,
      pagination: {
        page: Number.parseInt(page),
        limit: Number.parseInt(limit),
        total,
        pages: Math.ceil(total / limit),
      },
    })
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

// GET /sessions/:id - Get session detail
router.get("/:id", authenticateToken, async (req, res) => {
  try {
    const { id } = req.params
    const { include } = req.query

    const sessionResult = await db.query(
      `
            SELECT s.*, u.name as author_name 
            FROM sessions s 
            LEFT JOIN users u ON s.author_id = u.id 
            WHERE s.id = $1
        `,
      [id],
    )

    if (sessionResult.rows.length === 0) {
      return res.status(404).json({ error: "Session not found" })
    }

    const session = sessionResult.rows[0]

    // Include exercises if requested
    if (include && include.includes("exercises")) {
      const exercisesResult = await db.query(
        `
                SELECT e.*, se.repetitions, se.time, se.id as pivot_id
                FROM exercises e
                JOIN session_exercises se ON e.id = se.exercise_id
                WHERE se.session_id = $1
                ORDER BY e.name
            `,
        [id],
      )

      session.exercises = exercisesResult.rows
    }

    res.json(session)
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

// POST /sessions - Create session (trainer or admin only)
router.post("/", authenticateToken, requireRole(["trainer", "admin"]), validateSession, async (req, res) => {
  try {
    const { title, bodyArea, durationMins, description } = req.body
    const authorId = req.user.id

    const result = await db.query(
      `
            INSERT INTO sessions (title, body_area, duration_mins, description, author_id)
            VALUES ($1, $2, $3, $4, $5)
            RETURNING *
        `,
      [title, bodyArea, durationMins, description, authorId],
    )

    res.status(201).json(result.rows[0])
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

// PUT /sessions/:id - Update session
router.put("/:id", authenticateToken, requireRole(["trainer", "admin"]), validateSession, async (req, res) => {
  try {
    const { id } = req.params
    const { title, bodyArea, durationMins, description } = req.body
    const userId = req.user.id
    const userRole = req.user.role

    // Check if session exists and user has permission
    const sessionResult = await db.query("SELECT * FROM sessions WHERE id = $1", [id])
    if (sessionResult.rows.length === 0) {
      return res.status(404).json({ error: "Session not found" })
    }

    const session = sessionResult.rows[0]
    if (userRole !== "admin" && session.author_id !== userId) {
      return res.status(403).json({ error: "Not authorized to update this session" })
    }

    const result = await db.query(
      `
            UPDATE sessions 
            SET title = $1, body_area = $2, duration_mins = $3, description = $4, updated_at = CURRENT_TIMESTAMP
            WHERE id = $5
            RETURNING *
        `,
      [title, bodyArea, durationMins, description, id],
    )

    res.json(result.rows[0])
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

// DELETE /sessions/:id - Delete session
router.delete("/:id", authenticateToken, requireRole(["trainer", "admin"]), async (req, res) => {
  try {
    const { id } = req.params
    const userId = req.user.id
    const userRole = req.user.role

    // Check if session exists and user has permission
    const sessionResult = await db.query("SELECT * FROM sessions WHERE id = $1", [id])
    if (sessionResult.rows.length === 0) {
      return res.status(404).json({ error: "Session not found" })
    }

    const session = sessionResult.rows[0]
    if (userRole !== "admin" && session.author_id !== userId) {
      return res.status(403).json({ error: "Not authorized to delete this session" })
    }

    await db.query("DELETE FROM sessions WHERE id = $1", [id])
    return res.status(200).json({ message: "Session deleted successfully"});
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

// GET /sessions/:id/exercises - Get exercises attached to session
router.get("/:id/exercises", authenticateToken, async (req, res) => {
  try {
    const { id } = req.params

    const result = await db.query(
      `
            SELECT e.*, se.repetitions, se.time, se.id as pivot_id
            FROM exercises e
            JOIN session_exercises se ON e.id = se.exercise_id
            WHERE se.session_id = $1
            ORDER BY e.name
        `,
      [id],
    )

    res.json(result.rows)
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

// POST /sessions/:id/exercises - Attach exercise to session
// router.post("/:id/exercises", authenticateToken, requireRole(["trainer", "admin"]), async (req, res) => {
//   try {
//     const { id } = req.params
//     //const { exerciseId, repetitions, time } = req.body
//     const { exerciseId = req.body.exercise_id, repetitions, time } = req.body
//     const userId = req.user.id
//     const userRole = req.user.role

//     // Check if session exists and user has permission
//     const sessionResult = await db.query("SELECT * FROM sessions WHERE id = $1", [id])
//     if (sessionResult.rows.length === 0) {
//       return res.status(404).json({ error: "Session not found" })
//     }

//     const session = sessionResult.rows[0]
//     if (userRole !== "admin" && session.author_id !== userId) {
//       return res.status(403).json({ error: "Not authorized to modify this session" })
//     }

//     // Check if exercise exists
//     const exerciseResult = await db.query("SELECT * FROM exercises WHERE id = $1", [exerciseId])
//     if (exerciseResult.rows.length === 0) {
//       return res.status(404).json({ error: "Exercise not found" })
//     }

//     const result = await db.query(
//       `
//             INSERT INTO session_exercises (session_id, exercise_id, repetitions, time)
//             VALUES ($1, $2, $3, $4)
//             RETURNING *
//         `,
//       [id, exerciseId, repetitions, time],
//     )

//     res.status(201).json(result.rows[0])
//   } catch (error) {
//     if (error.code === "23505") {
//       // Unique constraint violation
//       return res.status(409).json({ error: "Exercise already attached to this session" })
//     }
//     res.status(500).json({ error: error.message })
//   }
// })

router.post("/:id/exercises", authenticateToken, requireRole(["trainer", "admin"]), async (req, res) => {
  try {
    const { id } = req.params;
    const {
      exerciseId: exerciseIdCamel,
      exercise_id: exerciseIdSnake,
      repetitions,
      time,
      occurrence,       // опционално: ако го подадеш, ще се ползва
      position          // опционално: за подредба
    } = req.body;

    const exerciseId = exerciseIdCamel ?? exerciseIdSnake;
    const userId = req.user.id;
    const userRole = req.user.role;

    if (!exerciseId) {
      return res.status(400).json({ error: "exerciseId is required" });
    }

    // 1) Проверка на сесия + права
    const sessionResult = await db.query("SELECT author_id FROM sessions WHERE id = $1", [id]);
    if (sessionResult.rows.length === 0) {
      return res.status(404).json({ error: "Session not found" });
    }
    if (userRole !== "admin" && sessionResult.rows[0].author_id !== userId) {
      return res.status(403).json({ error: "Not authorized to modify this session" });
    }

    // 2) Проверка на упражнение
    const exerciseResult = await db.query("SELECT id FROM exercises WHERE id = $1", [exerciseId]);
    if (exerciseResult.rows.length === 0) {
      return res.status(404).json({ error: "Exercise not found" });
    }

    // 3) Вмъкване:
    // - ако occurrence е подаден -> ползва се той
    // - ако НЕ е подаден -> взима се MAX(occurrence)+1 за (session, exercise)
    const insertSql = `
      WITH next AS (
        SELECT COALESCE(MAX(occurrence), 0) + 1 AS next_occ
        FROM session_exercises
        WHERE session_id = $1 AND exercise_id = $2
      )
      INSERT INTO session_exercises (session_id, exercise_id, repetitions, time, occurrence, position)
      SELECT
        $1::int,
        $2::int,
        $3::int,
        $4::int,
        COALESCE($5::smallint, (SELECT next_occ FROM next)),
        $6::int
      RETURNING *;
    `;

    const params = [
      id,
      exerciseId,
      repetitions ?? null,
      time ?? null,
      occurrence ?? null,
      position ?? null
    ];

    const result = await db.query(insertSql, params);
    return res.status(201).json(result.rows[0]);

  } catch (error) {
    if (error.code === "23505") {
      // UNIQUE violation => вероятно същото (session, exercise, occurrence) вече съществува
      return res.status(409).json({ error: "This exercise occurrence already exists in the session" });
    }
    console.error(error);
    return res.status(500).json({ error: "Internal server error" });
  }
});


module.exports = router
