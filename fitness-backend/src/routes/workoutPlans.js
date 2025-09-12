const express = require("express")
const { authenticateToken, requireRole } = require("../middleware/auth")
const { validateWorkoutPlan } = require("../middleware/validation")
const db = require("../config/database")
const router = express.Router()

// GET /workout-plans - List workout plans with filters
router.get("/", authenticateToken, async (req, res) => {
  try {
    const { goal, title, page = 1, limit = 1000 } = req.query
    const offset = (page - 1) * limit

    let query = `
            SELECT wp.*, u.name as author_name 
            FROM workout_plans wp 
            LEFT JOIN users u ON wp.author_id = u.id 
            WHERE 1=1
        `
    const params = []
    let paramCount = 0

    if (goal) {
      paramCount++
      query += ` AND wp.goal = $${paramCount}`
      params.push(goal)
    }

    if (title) {
      paramCount++
      query += ` AND wp.title ILIKE $${paramCount}`
      params.push(`%${title}%`)
    }

    query += ` ORDER BY wp.created_at DESC LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}`
    params.push(limit, offset)

    const result = await db.query(query, params)

    // Get total count
    let countQuery = "SELECT COUNT(*) FROM workout_plans wp WHERE 1=1"
    const countParams = []
    let countParamCount = 0

    if (goal) {
      countParamCount++
      countQuery += ` AND wp.goal = $${countParamCount}`
      countParams.push(goal)
    }

    if (title) {
      countParamCount++
      countQuery += ` AND wp.title ILIKE $${countParamCount}`
      countParams.push(`%${title}%`)
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

// GET /workout-plans/:id - Get workout plan detail
router.get("/:id", authenticateToken, async (req, res) => {
  try {
    const { id } = req.params
    const { include } = req.query

    const planResult = await db.query(
      `
            SELECT wp.*, u.name as author_name 
            FROM workout_plans wp 
            LEFT JOIN users u ON wp.author_id = u.id 
            WHERE wp.id = $1
        `,
      [id],
    )

    if (planResult.rows.length === 0) {
      return res.status(404).json({ error: "Workout plan not found" })
    }

    const plan = planResult.rows[0]

    // Include sessions and schedule if requested
    if (include && include.includes("sessions")) {
      const sessionsResult = await db.query(
        `
                SELECT s.*, wps.schedule, wps.id as pivot_id
                FROM sessions s
                JOIN workout_plan_sessions wps ON s.id = wps.session_id
                WHERE wps.workout_plan_id = $1
                ORDER BY s.title
            `,
        [id],
      )

      plan.sessions = sessionsResult.rows
    }

    res.json(plan)
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

// POST /workout-plans - Create workout plan (trainer or admin only)
router.post("/", authenticateToken, requireRole(["trainer", "admin"]), validateWorkoutPlan, async (req, res) => {
  try {
    const { title, goal } = req.body
    const authorId = req.user.id

    const result = await db.query(
      `
            INSERT INTO workout_plans (title, goal, author_id)
            VALUES ($1, $2, $3)
            RETURNING *
        `,
      [title, goal, authorId],
    )

    res.status(201).json(result.rows[0])
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

// PUT /workout-plans/:id - Update workout plan
router.put("/:id", authenticateToken, requireRole(["trainer", "admin"]), validateWorkoutPlan, async (req, res) => {
  try {
    const { id } = req.params
    const { title, goal } = req.body
    const userId = req.user.id
    const userRole = req.user.role

    // Check if plan exists and user has permission
    const planResult = await db.query("SELECT * FROM workout_plans WHERE id = $1", [id])
    if (planResult.rows.length === 0) {
      return res.status(404).json({ error: "Workout plan not found" })
    }

    const plan = planResult.rows[0]
    if (userRole !== "admin" && plan.author_id !== userId) {
      return res.status(403).json({ error: "Not authorized to update this workout plan" })
    }

    const result = await db.query(
      `
            UPDATE workout_plans 
            SET title = $1, goal = $2, updated_at = CURRENT_TIMESTAMP
            WHERE id = $3
            RETURNING *
        `,
      [title, goal, id],
    )

    res.json(result.rows[0])
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

router.delete("/:id", authenticateToken, requireRole(["trainer", "admin"]), async (req, res) => {
    try {
      const { id } = req.params;
      const userId = req.user.id;
      const userRole = req.user.role;
  
      // 1) Проверка за съществуване
      const planResult = await db.query(
        "SELECT author_id FROM workout_plans WHERE id = $1",
        [id]
      );
      if (planResult.rows.length === 0) {
        return res.status(404).json({ error: "Workout plan not found" });
      }
  
      // 2) Проверка за права
      const plan = planResult.rows[0];
      if (userRole !== "admin" && plan.author_id !== userId) {
        return res.status(403).json({ error: "Not authorized to delete this workout plan" });
      }
  
      // 3) Изтриване
      await db.query("DELETE FROM workout_plans WHERE id = $1", [id]);
  
      // 4) Върни съобщение
      return res.status(200).json({ message: "Workout plan deleted successfully"});
    } catch (error) {
      return res.status(500).json({ error: error.message });
    }
  });

router.get("/:id/sessions", authenticateToken, async (req, res) => {
  try {
    const { id } = req.params

    const result = await db.query(
      `
            SELECT s.*, wps.schedule, wps.id as pivot_id
            FROM sessions s
            JOIN workout_plan_sessions wps ON s.id = wps.session_id
            WHERE wps.workout_plan_id = $1
            ORDER BY s.title
        `,
      [id],
    )

    res.json(result.rows)
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

// POST /workout-plans/:id/sessions - Attach session to workout plan
router.post("/:id/sessions", authenticateToken, requireRole(["trainer", "admin"]), async (req, res) => {
  try {
    const { id } = req.params
    const { sessionId, schedule = [] } = req.body
    const userId = req.user.id
    const userRole = req.user.role

    // Check if workout plan exists and user has permission
    const planResult = await db.query("SELECT * FROM workout_plans WHERE id = $1", [id])
    if (planResult.rows.length === 0) {
      return res.status(404).json({ error: "Workout plan not found" })
    }

    const plan = planResult.rows[0]
    if (userRole !== "admin" && plan.author_id !== userId) {
      return res.status(403).json({ error: "Not authorized to modify this workout plan" })
    }

    // Check if session exists
    const sessionResult = await db.query("SELECT * FROM sessions WHERE id = $1", [sessionId])
    if (sessionResult.rows.length === 0) {
      return res.status(404).json({ error: "Session not found" })
    }

    const result = await db.query(
      `
            INSERT INTO workout_plan_sessions (workout_plan_id, session_id, schedule)
            VALUES ($1, $2, $3)
            RETURNING *
        `,
      [id, sessionId, JSON.stringify(schedule)],
    )

    res.status(201).json(result.rows[0])
  } catch (error) {
    if (error.code === "23505") {
      // Unique constraint violation
      return res.status(409).json({ error: "Session already attached to this workout plan" })
    }
    res.status(500).json({ error: error.message })
  }
})

module.exports = router
