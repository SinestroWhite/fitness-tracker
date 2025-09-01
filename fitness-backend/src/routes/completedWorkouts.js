const express = require("express")
const { authenticateToken, requireRole } = require("../middleware/auth")
const db = require("../config/database")
const router = express.Router()

// Get user's completed workouts with pagination and filtering
// router.get("/", authenticateToken, async (req, res) => {
//   try {
//     const { page = 1, limit = 10, workout_plan_id, start_date, end_date } = req.query
//     const offset = (page - 1) * limit
//     const userId = req.user.role === "user" ? req.user.id : req.query.user_id

//     if (!userId) {
//       return res.status(400).json({ error: "User ID is required for trainers/admins" })
//     }

//     let whereClause = "WHERE cw.user_id = $1"
//     const queryParams = [userId]
//     let paramCount = 1

//     if (workout_plan_id) {
//       paramCount++
//       whereClause += ` AND cw.workout_plan_id = $${paramCount}`
//       queryParams.push(workout_plan_id)
//     }

//     if (start_date) {
//       paramCount++
//       whereClause += ` AND cw.created_at >= $${paramCount}`
//       queryParams.push(start_date)
//     }

//     if (end_date) {
//       paramCount++
//       whereClause += ` AND cw.created_at <= $${paramCount}`
//       queryParams.push(end_date)
//     }

//     const query = `
//       SELECT 
//         cw.id,
//         cw.user_id,
//         cw.workout_plan_id,
//         cw.created_at,
//         wp.title as workout_title,
//         wp.goal as workout_goal,
//         u.name as user_name
//       FROM completed_user_workout_pivot cw
//       JOIN workout_plans wp ON cw.workout_plan_id = wp.id
//       JOIN users u ON cw.user_id = u.id
//       ${whereClause}
//       ORDER BY cw.created_at DESC
//       LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}
//     `

//     queryParams.push(limit, offset)
//     const result = await db.query(query, queryParams)

//     // Get total count for pagination
//     const countQuery = `
//       SELECT COUNT(*) 
//       FROM completed_user_workout_pivot cw 
//       ${whereClause}
//     `
//     const countResult = await db.query(countQuery, queryParams.slice(0, paramCount))
//     const totalCount = Number.parseInt(countResult.rows[0].count)

//     res.json({
//       completedWorkouts: result.rows,
//       pagination: {
//         currentPage: Number.parseInt(page),
//         totalPages: Math.ceil(totalCount / limit),
//         totalCount,
//         hasNext: offset + result.rows.length < totalCount,
//         hasPrev: page > 1,
//       },
//     })
//   } catch (error) {
//     console.error("Error fetching completed workouts:", error)
//     res.status(500).json({ error: "Internal server error" })
//   }
// })
router.get("/", authenticateToken, async (req, res) => {
    try {
      const { page = 1, limit = 10, workout_plan_id, start_date, end_date } = req.query
      const pageNum  = Number.parseInt(page)
      const limitNum = Number.parseInt(limit)
      const offset = (pageNum - 1) * limitNum
  
      const userId = req.user.role === "user" ? req.user.id : req.query.user_id
      if (!userId) {
        return res.status(400).json({ error: "User ID is required for trainers/admins" })
      }
  
      let whereClause = "WHERE cw.user_id = $1"
      const queryParams = [userId]
      let p = 1
  
      if (workout_plan_id) {
        whereClause += ` AND cw.workout_plan_id = $${++p}`
        queryParams.push(workout_plan_id)
      }
      if (start_date) {
        whereClause += ` AND cw.performed_on >= $${++p}::date`
        queryParams.push(start_date)
      }
      if (end_date) {
        whereClause += ` AND cw.performed_on <= $${++p}::date`
        queryParams.push(end_date)
      }
  
      const query = `
        SELECT 
          cw.id,
          cw.user_id,
          cw.workout_plan_id,
          cw.performed_on,
          cw.created_at,
          wp.title AS workout_title,
          wp.goal AS workout_goal,
          u.name AS user_name
        FROM completed_user_workout_pivot cw
        JOIN workout_plans wp ON cw.workout_plan_id = wp.id
        JOIN users u ON cw.user_id = u.id
        ${whereClause}
        ORDER BY cw.performed_on DESC, cw.created_at DESC
        LIMIT $${p + 1} OFFSET $${p + 2}
      `
      queryParams.push(limitNum, offset)
  
      const result = await db.query(query, queryParams)
  
      const countQuery = `SELECT COUNT(*) FROM completed_user_workout_pivot cw ${whereClause}`
      const countResult = await db.query(countQuery, queryParams.slice(0, p))
      const totalCount = Number.parseInt(countResult.rows[0].count)
  
      res.json({
        completedWorkouts: result.rows,
        pagination: {
          currentPage: pageNum,
          totalPages: Math.ceil(totalCount / limitNum),
          totalCount,
          hasNext: offset + result.rows.length < totalCount,
          hasPrev: pageNum > 1,
        },
      })
    } catch (error) {
      console.error("Error fetching completed workouts:", error)
      res.status(500).json({ error: "Internal server error" })
    }
  })
  

// Mark a workout as completed
// router.post("/", authenticateToken, async (req, res) => {
//   try {
//     const { workout_plan_id } = req.body
//     const userId = req.user.id

//     // Check if workout plan exists
//     const workoutCheck = await db.query("SELECT id FROM workout_plans WHERE id = $1", [workout_plan_id])

//     if (workoutCheck.rows.length === 0) {
//       return res.status(404).json({ error: "Workout plan not found" })
//     }

//     // Check if already completed today
//     const today = new Date().toISOString().split("T")[0]
//     const existingCompletion = await db.query(
//       "SELECT id FROM completed_user_workout_pivot WHERE user_id = $1 AND workout_plan_id = $2 AND created_at::date = $3",
//       [userId, workout_plan_id, today],
//     )

//     if (existingCompletion.rows.length > 0) {
//       return res.status(409).json({ error: "Workout already completed today" })
//     }

//     // Insert completed workout
//     const result = await db.query(
//       `INSERT INTO completed_user_workout_pivot (user_id, workout_plan_id, created_at)
//        VALUES ($1, $2, CURRENT_TIMESTAMP)
//        RETURNING id, user_id, workout_plan_id, created_at`,
//       [userId, workout_plan_id],
//     )

//     res.status(201).json({
//       message: "Workout marked as completed",
//       completedWorkout: result.rows[0],
//     })
//   } catch (error) {
//     console.error("Error marking workout as completed:", error)
//     res.status(500).json({ error: "Internal server error" })
//   }
// })
router.post("/", authenticateToken, async (req, res) => {
    try {
      const userId = req.user.role === "user" ? req.user.id : req.body.user_id
      const { workout_plan_id, performed_on } = req.body // 'YYYY-MM-DD'
  
      if (!userId || !workout_plan_id || !performed_on) {
        return res.status(400).json({ error: "user_id, workout_plan_id и performed_on са задължителни" })
      }
  
      const q = `
        INSERT INTO completed_user_workout_pivot (user_id, workout_plan_id, performed_on)
        VALUES ($1, $2, $3::date)
        ON CONFLICT (user_id, workout_plan_id, performed_on) DO NOTHING
        RETURNING id, user_id, workout_plan_id, performed_on, created_at
      `
      const r = await db.query(q, [userId, workout_plan_id, performed_on])
      return res.status(201).json({ completed: r.rows[0] ?? null })
    } catch (err) {
      console.error("Error marking completed:", err)
      res.status(500).json({ error: "Internal server error" })
    }
  })
  

// Get completion statistics
router.get("/stats", authenticateToken, async (req, res) => {
  try {
    const { user_id, period = "30" } = req.query
    const userId = req.user.role === "user" ? req.user.id : user_id

    if (!userId) {
      return res.status(400).json({ error: "User ID is required for trainers/admins" })
    }

    const daysAgo = Number.parseInt(period)
    const startDate = new Date()
    startDate.setDate(startDate.getDate() - daysAgo)

    // Get completion stats
    const statsQuery = `
      SELECT 
        COUNT(*) as total_completions,
        COUNT(DISTINCT workout_plan_id) as unique_workouts,
        COUNT(DISTINCT created_at::date) as active_days,
        AVG(daily_count.count) as avg_per_day
      FROM completed_user_workout_pivot cw
      LEFT JOIN (
        SELECT created_at::date as date, COUNT(*) as count
        FROM completed_user_workout_pivot
        WHERE user_id = $1 AND created_at >= $2
        GROUP BY created_at::date
      ) daily_count ON daily_count.date = cw.created_at::date
      WHERE cw.user_id = $1 AND cw.created_at >= $2
    `

    const statsResult = await db.query(statsQuery, [userId, startDate])

    // Get most completed workouts
    const topWorkoutsQuery = `
      SELECT 
        wp.title,
        wp.goal,
        COUNT(*) as completion_count
      FROM completed_user_workout_pivot cw
      JOIN workout_plans wp ON cw.workout_plan_id = wp.id
      WHERE cw.user_id = $1 AND cw.created_at >= $2
      GROUP BY wp.id, wp.title, wp.goal
      ORDER BY completion_count DESC
      LIMIT 5
    `

    const topWorkoutsResult = await db.query(topWorkoutsQuery, [userId, startDate])

    res.json({
      period: `${daysAgo} days`,
      stats: statsResult.rows[0],
      topWorkouts: topWorkoutsResult.rows,
    })
  } catch (error) {
    console.error("Error fetching completion stats:", error)
    res.status(500).json({ error: "Internal server error" })
  }
})

// Delete a completed workout record (admin/trainer only)
router.delete("/:id", authenticateToken, requireRole(["admin", "trainer"]), async (req, res) => {
  try {
    const { id } = req.params

    const result = await db.query("DELETE FROM completed_user_workout_pivot WHERE id = $1 RETURNING *", [id])

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Completed workout record not found" })
    }

    res.json({ message: "Completed workout record deleted successfully" })
  } catch (error) {
    console.error("Error deleting completed workout:", error)
    res.status(500).json({ error: "Internal server error" })
  }
})

module.exports = router

