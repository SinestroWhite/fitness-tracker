const express = require("express")
const { authenticateToken, requireRole } = require("../middleware/auth")
const db = require("../config/database")
const router = express.Router()

// PUT /workout-plan-sessions/:pivotId - Update schedule
router.put("/:pivotId", authenticateToken, requireRole(["trainer", "admin"]), async (req, res) => {
  try {
    const { pivotId } = req.params
    const { schedule } = req.body
    const userId = req.user.id
    const userRole = req.user.role

    // Check if pivot exists and user has permission
    const pivotResult = await db.query(
      `
            SELECT wps.*, wp.author_id 
            FROM workout_plan_sessions wps
            JOIN workout_plans wp ON wps.workout_plan_id = wp.id
            WHERE wps.id = $1
        `,
      [pivotId],
    )

    if (pivotResult.rows.length === 0) {
      return res.status(404).json({ error: "Workout plan session not found" })
    }

    const pivot = pivotResult.rows[0]
    if (userRole !== "admin" && pivot.author_id !== userId) {
      return res.status(403).json({ error: "Not authorized to modify this workout plan" })
    }

    const result = await db.query(
      `
            UPDATE workout_plan_sessions 
            SET schedule = $1
            WHERE id = $2
            RETURNING *
        `,
      [JSON.stringify(schedule), pivotId],
    )

    res.json(result.rows[0])
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

// DELETE /workout-plan-sessions/:pivotId - Detach session from workout plan
router.delete("/:pivotId", authenticateToken, requireRole(["trainer", "admin"]), async (req, res) => {
  try {
    const { pivotId } = req.params
    const userId = req.user.id
    const userRole = req.user.role

    // Check if pivot exists and user has permission
    const pivotResult = await db.query(
      `
            SELECT wps.*, wp.author_id 
            FROM workout_plan_sessions wps
            JOIN workout_plans wp ON wps.workout_plan_id = wp.id
            WHERE wps.id = $1
        `,
      [pivotId],
    )

    if (pivotResult.rows.length === 0) {
      return res.status(404).json({ error: "Workout plan session not found" })
    }

    const pivot = pivotResult.rows[0]
    if (userRole !== "admin" && pivot.author_id !== userId) {
      return res.status(403).json({ error: "Not authorized to modify this workout plan" })
    }

    await db.query("DELETE FROM workout_plan_sessions WHERE id = $1", [pivotId])
    return res.status(200).json({ message: "Workout plan session deleted successfully"});
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

module.exports = router
