// const express = require("express")
// const { authenticateToken, requireRole } = require("../middleware/auth")
// const db = require("../config/database")
// const router = express.Router()

// /**
//  * GET /completed-workout
//  * Списък със завършени тренировки (фигури), филтри по потребител, план, сесия и период.
//  * Пагинация: page, limit
//  * Филтри: workout_plan_id, session_id, start_date (YYYY-MM-DD), end_date (YYYY-MM-DD), user_id (за trainer/admin)
//  * Сортиране: по performed_on (DESC), после created_at (DESC)
//  */
// router.get("/", authenticateToken, async (req, res) => {
//   try {
//     const {
//       page = 1,
//       limit = 10,
//       workout_plan_id,
//       session_id,
//       start_date,
//       end_date,
//       user_id,
//     } = req.query

//     const pageNum  = Number.parseInt(page)
//     const limitNum = Number.parseInt(limit)
//     const offset   = (pageNum - 1) * limitNum

//     const userId = req.user.role === "user" ? req.user.id : user_id
//     if (!userId) {
//       return res.status(400).json({ error: "User ID is required for trainers/admins" })
//     }

//     let where = "WHERE cw.user_id = $1"
//     const params = [userId]
//     let p = 1

//     if (workout_plan_id) {
//       where += ` AND cw.workout_plan_id = $${++p}`
//       params.push(workout_plan_id)
//     }
//     if (session_id) {
//       where += ` AND cw.session_id = $${++p}`
//       params.push(session_id)
//     }
//     if (start_date) {
//       where += ` AND cw.performed_on >= $${++p}::date`
//       params.push(start_date)
//     }
//     if (end_date) {
//       where += ` AND cw.performed_on <= $${++p}::date`
//       params.push(end_date)
//     }

//     // Връщаме и заглавието на плана, целта, плюс инфо за сесията (pivot и самата session)
//     const query = `
//       SELECT
//         cw.id,
//         cw.user_id,
//         cw.workout_plan_id,
//         cw.session_id,
//         cw.performed_on,
//         cw.created_at,
//         wp.title  AS workout_title,
//         wp.goal   AS workout_goal,
//         u.name    AS user_name,
//         wps.session_id AS pivot_session_id,
//         s.title   AS session_title,
//         s.duration_mins AS session_duration_mins,
//         s.body_area AS session_body_area
//       FROM completed_user_workout_pivot cw
//       JOIN workout_plans wp        ON wp.id  = cw.workout_plan_id
//       JOIN users u                 ON u.id   = cw.user_id
//       LEFT JOIN workout_plan_sessions wps ON wps.id  = cw.session_id
//       LEFT JOIN sessions s         ON s.id   = wps.session_id
//       ${where}
//       ORDER BY cw.performed_on DESC, cw.created_at DESC
//       LIMIT $${p + 1} OFFSET $${p + 2}
//     `
//     params.push(limitNum, offset)

//     const result = await db.query(query, params)

//     const countQuery = `SELECT COUNT(*) FROM completed_user_workout_pivot cw ${where}`
//     const countResult = await db.query(countQuery, params.slice(0, p))
//     const totalCount = Number.parseInt(countResult.rows[0].count)

//     res.json({
//       completedWorkouts: result.rows,
//       pagination: {
//         currentPage: pageNum,
//         totalPages: Math.ceil(totalCount / limitNum),
//         totalCount,
//         hasNext: offset + result.rows.length < totalCount,
//         hasPrev: pageNum > 1,
//       },
//     })
//   } catch (error) {
//     console.error("Error fetching completed workouts:", error)
//     res.status(500).json({ error: "Internal server error" })
//   }
// })

// /**
//  * POST /completed-workout
//  * Маркира конкретна СЕСИЯ от план като завършена за определена дата.
//  * Изисква: user_id (ако trainer/admin), workout_plan_id, session_id (pivot id от workout_plan_sessions), performed_on (YYYY-MM-DD)
//  * Поведение: ако вече има запис за същия (user, plan, session, date) → 200 + already_completed: true
//  * Иначе → 201 + already_completed: false
//  */
// router.post("/", authenticateToken, async (req, res) => {
//   try {
//     const userId = req.user.role === "user" ? req.user.id : req.body.user_id
//     const { workout_plan_id, session_id, performed_on } = req.body

//     if (!userId || !workout_plan_id || !session_id || !performed_on) {
//       return res.status(400).json({
//         error: "user_id, workout_plan_id, session_id и performed_on са задължителни",
//       })
//     }

//     // по желание можеш да валидираш дали session_id принадлежи на този workout_plan_id
//     // (за да не се марква чужда сесия към друг план)
//     const checkPivot = await db.query(
//       "SELECT 1 FROM workout_plan_sessions WHERE id = $1 AND workout_plan_id = $2",
//       [session_id, workout_plan_id]
//     )
//     if (checkPivot.rows.length === 0) {
//       return res.status(400).json({ error: "session_id не принадлежи на подадения workout_plan_id" })
//     }

//     const q = `
//       WITH ins AS (
//         INSERT INTO completed_user_workout_pivot (user_id, workout_plan_id, session_id, performed_on)
//         VALUES ($1, $2, $3, $4::date)
//         ON CONFLICT (user_id, workout_plan_id, session_id, performed_on) DO NOTHING
//         RETURNING id, user_id, workout_plan_id, session_id, performed_on, created_at
//       )
//       SELECT *, FALSE AS already_completed FROM ins
//       UNION ALL
//       SELECT id, user_id, workout_plan_id, session_id, performed_on, created_at, TRUE AS already_completed
//       FROM completed_user_workout_pivot
//       WHERE NOT EXISTS (SELECT 1 FROM ins)
//         AND user_id = $1 AND workout_plan_id = $2 AND session_id = $3 AND performed_on = $4::date
//       LIMIT 1
//     `
//     const r = await db.query(q, [userId, workout_plan_id, session_id, performed_on])
//     const row = r.rows[0] || null

//     if (row && row.already_completed) {
//       return res.status(200).json({ completed: row, already_completed: true })
//     } else if (row) {
//       return res.status(201).json({ completed: row, already_completed: false })
//     } else {
//       return res.status(500).json({ error: "Неуспешно записване" })
//     }
//   } catch (err) {
//     console.error("Error marking completed:", err)
//     res.status(500).json({ error: "Internal server error" })
//   }
// })

// /**
//  * GET /completed-workout/stats
//  * Статистики по последните N дни (по подразбиране 30).
//  * Използваме performed_on, не created_at (за да е по график).
//  */
// router.get("/stats", authenticateToken, async (req, res) => {
//   try {
//     const { user_id, period = "30" } = req.query
//     const userId = req.user.role === "user" ? req.user.id : user_id

//     if (!userId) {
//       return res.status(400).json({ error: "User ID is required for trainers/admins" })
//     }

//     const daysAgo = Number.parseInt(period)
//     const startDate = new Date()
//     startDate.setDate(startDate.getDate() - daysAgo)

//     // Обща статистика (по performed_on)
//     const statsQuery = `
//       WITH daily AS (
//         SELECT performed_on::date AS d, COUNT(*) AS c
//         FROM completed_user_workout_pivot
//         WHERE user_id = $1 AND performed_on >= $2::date
//         GROUP BY performed_on::date
//       )
//       SELECT
//         (SELECT COUNT(*) FROM completed_user_workout_pivot WHERE user_id = $1 AND performed_on >= $2::date) AS total_completions,
//         (SELECT COUNT(DISTINCT workout_plan_id) FROM completed_user_workout_pivot WHERE user_id = $1 AND performed_on >= $2::date) AS unique_workouts,
//         (SELECT COUNT(*) FROM daily) AS active_days,
//         (SELECT AVG(c) FROM daily)::numeric(10,2) AS avg_per_day
//     `
//     const statsResult = await db.query(statsQuery, [userId, startDate.toISOString().slice(0, 10)])

//     // Топ планове (по performed_on)
//     const topWorkoutsQuery = `
//       SELECT
//         wp.title,
//         wp.goal,
//         COUNT(*) AS completion_count
//       FROM completed_user_workout_pivot cw
//       JOIN workout_plans wp ON wp.id = cw.workout_plan_id
//       WHERE cw.user_id = $1 AND cw.performed_on >= $2::date
//       GROUP BY wp.id, wp.title, wp.goal
//       ORDER BY completion_count DESC
//       LIMIT 5
//     `
//     const topWorkoutsResult = await db.query(topWorkoutsQuery, [userId, startDate.toISOString().slice(0, 10)])

//     res.json({
//       period: `${daysAgo} days`,
//       stats: statsResult.rows[0],
//       topWorkouts: topWorkoutsResult.rows,
//     })
//   } catch (error) {
//     console.error("Error fetching completion stats:", error)
//     res.status(500).json({ error: "Internal server error" })
//   }
// })

// /**
//  * DELETE /completed-workout/:id
//  * Триене на completion запис (admin/trainer)
//  */
// router.delete("/:id", authenticateToken, requireRole(["admin", "trainer"]), async (req, res) => {
//   try {
//     const { id } = req.params
//     const result = await db.query(
//       "DELETE FROM completed_user_workout_pivot WHERE id = $1 RETURNING *",
//       [id]
//     )
//     if (result.rows.length === 0) {
//       return res.status(404).json({ error: "Completed workout record not found" })
//     }
//     res.json({ message: "Completed workout record deleted successfully" })
//   } catch (error) {
//     console.error("Error deleting completed workout:", error)
//     res.status(500).json({ error: "Internal server error" })
//   }
// })

// module.exports = router



const express = require("express")
const { authenticateToken, requireRole } = require("../middleware/auth")
const db = require("../config/database")
const router = express.Router()

/**
 * HELPERS
 */
function getUserIdFromReq(req, explicitUserId) {
  if (req.user.role === "user") return req.user.id
  return explicitUserId
}

async function ensurePivotMatchesSessionExercise(wpsId, sessionExerciseId) {
  // Validates that the session_exercise belongs to the same session as the pivot (workout_plan_sessions)
  const q = `
    SELECT 1
    FROM workout_plan_sessions wps
    JOIN session_exercises se ON se.session_id = wps.session_id
    WHERE wps.id = $1 AND se.id = $2
    LIMIT 1
  `
  const r = await db.query(q, [wpsId, sessionExerciseId])
  return r.rows.length > 0
}

/**
 * ================================
 * SESSION-LEVEL COMPLETIONS (existing)
 * ================================
 */

/**
 * GET /completed-workout
 * List completed sessions (with filters + pagination)
 */
router.get("/", authenticateToken, async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      workout_plan_id,
      session_id,
      start_date,
      end_date,
      user_id,
    } = req.query

    const pageNum  = Number.parseInt(page, 10)
    const limitNum = Number.parseInt(limit, 10)
    const offset   = (pageNum - 1) * limitNum

    const userId = getUserIdFromReq(req, user_id)
    if (!userId) {
      return res.status(400).json({ error: "User ID is required for trainers/admins" })
    }

    let where = "WHERE cw.user_id = $1"
    const params = [userId]
    let p = 1

    if (workout_plan_id) {
      where += ` AND cw.workout_plan_id = $${++p}`
      params.push(workout_plan_id)
    }
    if (session_id) {
      // NOTE: cw.session_id points to workout_plan_sessions.id
      where += ` AND cw.session_id = $${++p}`
      params.push(session_id)
    }
    if (start_date) {
      where += ` AND cw.performed_on >= $${++p}::date`
      params.push(start_date)
    }
    if (end_date) {
      where += ` AND cw.performed_on <= $${++p}::date`
      params.push(end_date)
    }

    const query = `
      SELECT
        cw.id,
        cw.user_id,
        cw.workout_plan_id,
        cw.session_id,                -- (pivot id = workout_plan_sessions.id)
        cw.performed_on,
        cw.created_at,
        wp.title  AS workout_title,
        wp.goal   AS workout_goal,
        u.name    AS user_name,
        wps.session_id AS pivot_session_id,
        s.title   AS session_title,
        s.duration_mins AS session_duration_mins,
        s.body_area AS session_body_area
      FROM completed_user_workout_pivot cw
      JOIN workout_plans wp        ON wp.id  = cw.workout_plan_id
      JOIN users u                 ON u.id   = cw.user_id
      LEFT JOIN workout_plan_sessions wps ON wps.id  = cw.session_id
      LEFT JOIN sessions s         ON s.id   = wps.session_id
      ${where}
      ORDER BY cw.performed_on DESC, cw.created_at DESC
      LIMIT $${p + 1} OFFSET $${p + 2}
    `
    params.push(limitNum, offset)

    const result = await db.query(query, params)

    const countQuery = `SELECT COUNT(*) FROM completed_user_workout_pivot cw ${where}`
    const countResult = await db.query(countQuery, params.slice(0, p))
    const totalCount = Number.parseInt(countResult.rows[0].count, 10)

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

/**
 * POST /completed-workout
 * Mark a scheduled session (pivot) completed for a date (idempotent).
 * Body: { user_id?, workout_plan_id, session_id (pivot), performed_on }
 */
router.post("/", authenticateToken, async (req, res) => {
  try {
    const userId = getUserIdFromReq(req, req.body.user_id)
    const { workout_plan_id, session_id, performed_on } = req.body

    if (!userId || !workout_plan_id || !session_id || !performed_on) {
      return res.status(400).json({
        error: "user_id, workout_plan_id, session_id и performed_on са задължителни",
      })
    }

    // Ensure the pivot belongs to the workout plan
    const checkPivot = await db.query(
      "SELECT 1 FROM workout_plan_sessions WHERE id = $1 AND workout_plan_id = $2",
      [session_id, workout_plan_id]
    )
    if (checkPivot.rows.length === 0) {
      return res.status(400).json({ error: "session_id не принадлежи на подадения workout_plan_id" })
    }

    const q = `
      WITH ins AS (
        INSERT INTO completed_user_workout_pivot (user_id, workout_plan_id, session_id, performed_on)
        VALUES ($1, $2, $3, $4::date)
        ON CONFLICT (user_id, workout_plan_id, session_id, performed_on) DO NOTHING
        RETURNING id, user_id, workout_plan_id, session_id, performed_on, created_at
      )
      SELECT *, FALSE AS already_completed FROM ins
      UNION ALL
      SELECT id, user_id, workout_plan_id, session_id, performed_on, created_at, TRUE AS already_completed
      FROM completed_user_workout_pivot
      WHERE NOT EXISTS (SELECT 1 FROM ins)
        AND user_id = $1 AND workout_plan_id = $2 AND session_id = $3 AND performed_on = $4::date
      LIMIT 1
    `
    const r = await db.query(q, [userId, workout_plan_id, session_id, performed_on])
    const row = r.rows[0] || null

    if (row && row.already_completed) {
      return res.status(200).json({ completed: row, already_completed: true })
    } else if (row) {
      return res.status(201).json({ completed: row, already_completed: false })
    } else {
      return res.status(500).json({ error: "Неуспешно записване" })
    }
  } catch (err) {
    console.error("Error marking completed:", err)
    res.status(500).json({ error: "Internal server error" })
  }
})

/**
 * GET /completed-workout/stats
 * High-level stats over last N days (default 30) based on performed_on.
 */
router.get("/stats", authenticateToken, async (req, res) => {
  try {
    const { user_id, period = "30" } = req.query
    const userId = getUserIdFromReq(req, user_id)

    if (!userId) {
      return res.status(400).json({ error: "User ID is required for trainers/admins" })
    }

    const daysAgo = Number.parseInt(period, 10)
    const startDate = new Date()
    startDate.setDate(startDate.getDate() - daysAgo)
    const startStr = startDate.toISOString().slice(0, 10)

    const statsQuery = `
      WITH daily AS (
        SELECT performed_on::date AS d, COUNT(*) AS c
        FROM completed_user_workout_pivot
        WHERE user_id = $1 AND performed_on >= $2::date
        GROUP BY performed_on::date
      )
      SELECT
        (SELECT COUNT(*) FROM completed_user_workout_pivot WHERE user_id = $1 AND performed_on >= $2::date) AS total_completions,
        (SELECT COUNT(DISTINCT workout_plan_id) FROM completed_user_workout_pivot WHERE user_id = $1 AND performed_on >= $2::date) AS unique_workouts,
        (SELECT COUNT(*) FROM daily) AS active_days,
        (SELECT AVG(c) FROM daily)::numeric(10,2) AS avg_per_day
    `
    const statsResult = await db.query(statsQuery, [userId, startStr])

    const topWorkoutsQuery = `
      SELECT
        wp.title,
        wp.goal,
        COUNT(*) AS completion_count
      FROM completed_user_workout_pivot cw
      JOIN workout_plans wp ON wp.id = cw.workout_plan_id
      WHERE cw.user_id = $1 AND cw.performed_on >= $2::date
      GROUP BY wp.id, wp.title, wp.goal
      ORDER BY completion_count DESC
      LIMIT 5
    `
    const topWorkoutsResult = await db.query(topWorkoutsQuery, [userId, startStr])

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

/**
 * DELETE /completed-workout/:id
 * Delete a session-level completion (admin/trainer)
 */
router.delete("/:id", authenticateToken, requireRole(["admin", "trainer"]), async (req, res) => {
  try {
    const { id } = req.params
    const result = await db.query(
      "DELETE FROM completed_user_workout_pivot WHERE id = $1 RETURNING *",
      [id]
    )
    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Completed workout record not found" })
    }
    res.json({ message: "Completed workout record deleted successfully" })
  } catch (error) {
    console.error("Error deleting completed workout:", error)
    res.status(500).json({ error: "Internal server error" })
  }
})

/**
 * =========================================
 * EXERCISE-LEVEL COMPLETIONS (new endpoints)
 * =========================================
 */

/**
 * GET /completed-workout/exercises
 * Paginated list of per-exercise completions.
 * Query: page, limit, workout_plan_id?, session_id?(pivot), session_exercise_id?, start_date?, end_date?, user_id?
 */
router.get("/exercises", authenticateToken, async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      workout_plan_id,
      session_id,
      session_exercise_id,
      start_date,
      end_date,
      user_id,
    } = req.query

    const pageNum  = Number.parseInt(page, 10)
    const limitNum = Number.parseInt(limit, 10)
    const offset   = (pageNum - 1) * limitNum

    const userId = getUserIdFromReq(req, user_id)
    if (!userId) {
      return res.status(400).json({ error: "User ID is required for trainers/admins" })
    }

    let where = "WHERE c.user_id = $1"
    const params = [userId]
    let p = 1

    if (workout_plan_id) {
      where += ` AND c.workout_plan_id = $${++p}`
      params.push(workout_plan_id)
    }
    if (session_id) {
      where += ` AND c.workout_plan_session_id = $${++p}`
      params.push(session_id)
    }
    if (session_exercise_id) {
      where += ` AND c.session_exercise_id = $${++p}`
      params.push(session_exercise_id)
    }
    if (start_date) {
      where += ` AND c.performed_on >= $${++p}::date`
      params.push(start_date)
    }
    if (end_date) {
      where += ` AND c.performed_on <= $${++p}::date`
      params.push(end_date)
    }

    const q = `
      SELECT
        c.id,
        c.user_id,
        c.workout_plan_id,
        c.workout_plan_session_id AS session_id, -- alias to keep frontend consistent
        c.session_exercise_id,
        c.performed_on,
        c.completed,
        c.reps_prescribed,
        c.time_prescribed,
        c.reps_done,
        c.time_done,
        c.weight_kg,
        c.distance_m,
        c.notes,
        c.created_at,
        e.name AS exercise_name,
        e.image AS exercise_image,
        e.video AS exercise_video,
        se.occurrence,
        se.position
      FROM completed_user_session_exercises c
      JOIN session_exercises se ON se.id = c.session_exercise_id
      JOIN exercises e         ON e.id  = se.exercise_id
      ${where}
      ORDER BY c.performed_on DESC, c.created_at DESC
      LIMIT $${p + 1} OFFSET $${p + 2}
    `
    params.push(limitNum, offset)

    const result = await db.query(q, params)
    const countResult = await db.query(
      `SELECT COUNT(*) FROM completed_user_session_exercises c ${where}`,
      params.slice(0, p)
    )
    const totalCount = Number.parseInt(countResult.rows[0].count, 10)

    res.json({
      completedExercises: result.rows,
      pagination: {
        currentPage: pageNum,
        totalPages: Math.ceil(totalCount / limitNum),
        totalCount,
        hasNext: offset + result.rows.length < totalCount,
        hasPrev: pageNum > 1,
      },
    })
  } catch (err) {
    console.error("Error fetching completed exercises:", err)
    res.status(500).json({ error: "Internal server error" })
  }
})

/**
 * GET /completed-workout/exercises/checklist
 * Returns the prescribed exercise list for a given pivot session + date,
 * with the user's completion merged (ideal for a checklist UI).
 * Query: workout_plan_id, session_id (pivot), performed_on (YYYY-MM-DD), user_id?
 */
router.get("/exercises/checklist", authenticateToken, async (req, res) => {
  try {
    const userId = getUserIdFromReq(req, req.query.user_id)
    const { workout_plan_id, session_id, performed_on } = req.query

    if (!userId || !workout_plan_id || !session_id || !performed_on) {
      return res.status(400).json({ error: "workout_plan_id, session_id, performed_on са задължителни" })
    }

    // Validate pivot belongs to plan
    const chk = await db.query(
      "SELECT session_id FROM workout_plan_sessions WHERE id = $1 AND workout_plan_id = $2",
      [session_id, workout_plan_id]
    )
    if (chk.rows.length === 0) {
      return res.status(400).json({ error: "session_id не принадлежи на подадения workout_plan_id" })
    }
    const baseSessionId = chk.rows[0].session_id

    // Pull prescribed + left join completions
    const q = `
      SELECT
        wps.id AS workout_plan_session_id,
        wps.workout_plan_id,
        se.id  AS session_exercise_id,
        se.session_id,
        se.exercise_id,
        se.occurrence,
        se.position,
        se.repetitions AS reps_prescribed,
        se.time        AS time_prescribed,
        e.name         AS exercise_name,
        e.image        AS exercise_image,
        e.video        AS exercise_video,
        c.id           AS completion_id,
        c.completed,
        c.reps_done,
        c.time_done,
        c.weight_kg,
        c.distance_m,
        c.notes
      FROM workout_plan_sessions wps
      JOIN session_exercises se ON se.session_id = wps.session_id
      JOIN exercises e          ON e.id = se.exercise_id
      LEFT JOIN completed_user_session_exercises c
        ON c.user_id                 = $1
       AND c.workout_plan_id         = wps.workout_plan_id
       AND c.workout_plan_session_id = wps.id
       AND c.session_exercise_id     = se.id
       AND c.performed_on            = $4::date
      WHERE wps.id = $2 AND wps.workout_plan_id = $3
      ORDER BY se.position NULLS LAST, se.occurrence, se.id
    `
    const r = await db.query(q, [userId, session_id, workout_plan_id, performed_on])

    res.json({
      workout_plan_id: Number(workout_plan_id),
      session_id: Number(session_id),
      performed_on,
      items: r.rows,
    })
  } catch (err) {
    console.error("Error fetching checklist:", err)
    res.status(500).json({ error: "Internal server error" })
  }
})

/**
 * POST /completed-workout/exercises
 * Upsert a single exercise completion for a given pivot session + date.
 * Body: { user_id?, workout_plan_id, session_id (pivot), session_exercise_id, performed_on, completed?, reps_done?, time_done?, weight_kg?, distance_m?, notes? }
 */
router.post("/exercises", authenticateToken, async (req, res) => {
  try {
    const userId = getUserIdFromReq(req, req.body.user_id)
    const {
      workout_plan_id,
      session_id,            // pivot id (workout_plan_sessions.id)
      session_exercise_id,   // the prescribed row
      performed_on,
      completed = true,
      reps_done = null,
      time_done = null,
      weight_kg = null,
      distance_m = null,
      notes = null,
    } = req.body

    if (!userId || !workout_plan_id || !session_id || !session_exercise_id || !performed_on) {
      return res.status(400).json({ error: "user_id?, workout_plan_id, session_id, session_exercise_id, performed_on са задължителни" })
    }

    // Validate relationships
    const pivotOk = await db.query(
      "SELECT 1 FROM workout_plan_sessions WHERE id = $1 AND workout_plan_id = $2",
      [session_id, workout_plan_id]
    )
    if (pivotOk.rows.length === 0) {
      return res.status(400).json({ error: "session_id не принадлежи на подадения workout_plan_id" })
    }
    const belongs = await ensurePivotMatchesSessionExercise(session_id, session_exercise_id)
    if (!belongs) {
      return res.status(400).json({ error: "session_exercise_id не принадлежи на подадения pivot session_id" })
    }

    // Snapshot prescribed values (optional but handy)
    const pres = await db.query(
      "SELECT repetitions AS reps_prescribed, time AS time_prescribed FROM session_exercises WHERE id = $1",
      [session_exercise_id]
    )
    const { reps_prescribed, time_prescribed } = pres.rows[0] || {}

    const upsert = `
      INSERT INTO completed_user_session_exercises
        (user_id, workout_plan_id, workout_plan_session_id, performed_on, session_exercise_id,
         completed, reps_prescribed, time_prescribed, reps_done, time_done, weight_kg, distance_m, notes)
      VALUES
        ($1, $2, $3, $4::date, $5, $6, $7, $8, $9, $10, $11, $12, $13)
      ON CONFLICT (user_id, workout_plan_id, workout_plan_session_id, session_exercise_id, performed_on)
      DO UPDATE SET
        completed       = EXCLUDED.completed,
        reps_done       = EXCLUDED.reps_done,
        time_done       = EXCLUDED.time_done,
        weight_kg       = EXCLUDED.weight_kg,
        distance_m      = EXCLUDED.distance_m,
        notes           = EXCLUDED.notes
      RETURNING *
    `
    const r = await db.query(upsert, [
      userId,
      workout_plan_id,
      session_id,
      performed_on,
      session_exercise_id,
      completed,
      reps_prescribed ?? null,
      time_prescribed ?? null,
      reps_done,
      time_done,
      weight_kg,
      distance_m,
      notes,
    ])

    res.status(201).json({ completion: r.rows[0] })
  } catch (err) {
    console.error("Error upserting exercise completion:", err)
    res.status(500).json({ error: "Internal server error" })
  }
})

/**
 * POST /completed-workout/exercises/bulk
 * Bulk upsert for many items in one request.
 * Body: {
 *   user_id?,
 *   workout_plan_id,
 *   session_id (pivot),
 *   performed_on,
 *   items: [{ session_exercise_id, completed?, reps_done?, time_done?, weight_kg?, distance_m?, notes? }, ...]
 * }
 */
router.post("/exercises/bulk", authenticateToken, async (req, res) => {

  try {
    const userId = getUserIdFromReq(req, req.body.user_id)
    const { workout_plan_id, session_id, performed_on, items = [] } = req.body

    if (!userId || !workout_plan_id || !session_id || !performed_on) {
      return res.status(400).json({ error: "user_id?, workout_plan_id, session_id, performed_on са задължителни" })
    }
    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: "items трябва да е непразен масив" })
    }

    // Validate pivot belongs to plan
    const pivotOk = await db.query(
      "SELECT 1 FROM workout_plan_sessions WHERE id = $1 AND workout_plan_id = $2",
      [session_id, workout_plan_id]
    )
    if (pivotOk.rows.length === 0) {
      return res.status(400).json({ error: "session_id не принадлежи на подадения workout_plan_id" })
    }

    await db.query("BEGIN")

    // Build a map of prescribed values for all session_exercise_ids (one hit)
    const ids = items.map(i => Number(i.session_exercise_id)).filter(Boolean)
    const presQ = `
      SELECT id, repetitions AS reps_prescribed, time AS time_prescribed
      FROM session_exercises
      WHERE id = ANY($1::int[])
    `
    const presR = await db.query(presQ, [ids])
    const presMap = new Map(presR.rows.map(r => [r.id, r]))

    // Validate each belongs
    for (const it of items) {
      const ok = await ensurePivotMatchesSessionExercise(session_id, it.session_exercise_id)
      if (!ok) {
        await db.query("ROLLBACK")
        return res.status(400).json({ error: `session_exercise_id ${it.session_exercise_id} не принадлежи на подадения pivot session_id` })
      }
    }

    const upsert = `
      INSERT INTO completed_user_session_exercises
        (user_id, workout_plan_id, workout_plan_session_id, performed_on, session_exercise_id,
         completed, reps_prescribed, time_prescribed, reps_done, time_done, weight_kg, distance_m, notes)
      VALUES
        ($1, $2, $3, $4::date, $5, $6, $7, $8, $9, $10, $11, $12, $13)
      ON CONFLICT (user_id, workout_plan_id, workout_plan_session_id, session_exercise_id, performed_on)
      DO UPDATE SET
        completed  = EXCLUDED.completed,
        reps_done  = EXCLUDED.reps_done,
        time_done  = EXCLUDED.time_done,
        weight_kg  = EXCLUDED.weight_kg,
        distance_m = EXCLUDED.distance_m,
        notes      = EXCLUDED.notes
      RETURNING *
    `

    const results = []
    for (const it of items) {
      const snap = presMap.get(Number(it.session_exercise_id)) || {}
      const r = await db.query(upsert, [
        userId,
        workout_plan_id,
        session_id,
        performed_on,
        it.session_exercise_id,
        it.completed ?? true,
        snap.reps_prescribed ?? null,
        snap.time_prescribed ?? null,
        it.reps_done ?? null,
        it.time_done ?? null,
        it.weight_kg ?? null,
        it.distance_m ?? null,
        it.notes ?? null,
      ])
      results.push(r.rows[0])
    }

    await db.query("COMMIT")
    res.status(201).json({ completions: results })
  } catch (err) {
    await db.query("ROLLBACK")
    console.error("Error bulk upserting exercise completion:", err)
    res.status(500).json({ error: "Internal server error" })
  }
})

/**
 * DELETE /completed-workout/exercises/:id
 * Delete a single exercise completion (admin/trainer)
 */
router.delete("/exercises/:id", authenticateToken, requireRole(["admin", "trainer"]), async (req, res) => {
  try {
    const { id } = req.params
    const r = await db.query(
      "DELETE FROM completed_user_session_exercises WHERE id = $1 RETURNING *",
      [id]
    )
    if (r.rows.length === 0) {
      return res.status(404).json({ error: "Exercise completion not found" })
    }
    res.json({ message: "Exercise completion deleted successfully" })
  } catch (err) {
    console.error("Error deleting exercise completion:", err)
    res.status(500).json({ error: "Internal server error" })
  }
})

module.exports = router
