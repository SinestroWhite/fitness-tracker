const express = require("express")
const { authenticateToken, requireRole } = require("../middleware/auth")
const db = require("../config/database")
const router = express.Router()

// PUT /session-exercises/:pivotId - Update repetitions or time
router.put("/:pivotId", authenticateToken, requireRole(["trainer", "admin"]), async (req, res) => {
  try {
    const { pivotId } = req.params
    const { repetitions, time } = req.body
    const userId = req.user.id
    const userRole = req.user.role

    // Check if pivot exists and user has permission
    const pivotResult = await db.query(
      `
            SELECT se.*, s.author_id 
            FROM session_exercises se
            JOIN sessions s ON se.session_id = s.id
            WHERE se.id = $1
        `,
      [pivotId],
    )

    if (pivotResult.rows.length === 0) {
      return res.status(404).json({ error: "Session exercise not found" })
    }

    const pivot = pivotResult.rows[0]
    if (userRole !== "admin" && pivot.author_id !== userId) {
      return res.status(403).json({ error: "Not authorized to modify this session" })
    }

    const result = await db.query(
      `
            UPDATE session_exercises 
            SET repetitions = $1, time = $2
            WHERE id = $3
            RETURNING *
        `,
      [repetitions, time, pivotId],
    )

    res.json(result.rows[0])
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

// DELETE /session-exercises/:pivotId - Detach exercise from session
router.delete("/:pivotId", authenticateToken, requireRole(["trainer", "admin"]), async (req, res) => {
  try {
    const { pivotId } = req.params
    const userId = req.user.id
    const userRole = req.user.role

    // Check if pivot exists and user has permission
    const pivotResult = await db.query(
      `
            SELECT se.*, s.author_id 
            FROM session_exercises se
            JOIN sessions s ON se.session_id = s.id
            WHERE se.id = $1
        `,
      [pivotId],
    )

    if (pivotResult.rows.length === 0) {
      return res.status(404).json({ error: "Session exercise not found" })
    }

    const pivot = pivotResult.rows[0]
    if (userRole !== "admin" && pivot.author_id !== userId) {
      return res.status(403).json({ error: "Not authorized to modify this session" })
    }

    await db.query("DELETE FROM session_exercises WHERE id = $1", [pivotId])
    return res.status(200).json({ message: "Session exercises deleted successfully"});
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

module.exports = router
