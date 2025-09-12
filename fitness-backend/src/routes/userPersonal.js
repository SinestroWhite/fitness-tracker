const express = require("express")
const { getDb  } = require("../config/database") 
const { authenticateToken, requireRole } = require("../middleware/auth")
const { userPersonalValidation } = require("../middleware/validation")

const router = express.Router()

// Helper to run a single-row SELECT
async function fetchProfileByUserId(userId) {
  const db = getDb()
  const { rows } = await db.query(
    `SELECT * FROM user_personal WHERE user_id = $1`,
    [userId],
  )
  return rows[0] || null
}

// Helper to build a dynamic UPSERT for provided fields only
function buildUpsert({ userId, data }) {
  // Only include columns that are !== undefined (allow null if explicitly sent)
  const colMap = {
    sex: data.sex,
    height: data.height,
    goal: data.goal,
    nutrition_plan_id: data.nutritionPlanId,
    workout_plan_id: data.workoutPlanId,
  }

  const cols = []
  const vals = [userId] // $1 is user_id
  const placeholders = ["$1"]
  let idx = 2

  for (const [col, value] of Object.entries(colMap)) {
    if (value !== undefined) {
      cols.push(col)
      vals.push(value)
      placeholders.push(`$${idx++}`)
    }
  }

  if (cols.length === 0) {
    return { sql: null, params: null }
  }

  // ON CONFLICT updates only the provided columns
  const setClause = cols.map((c) => `${c} = EXCLUDED.${c}`).join(", ")

  const sql = `
    INSERT INTO user_personal (user_id, ${cols.join(", ")})
    VALUES (${placeholders.join(", ")})
    ON CONFLICT (user_id)
    DO UPDATE SET ${setClause}
    RETURNING *;
  `
  return { sql, params: vals }
}

// GET /user-personal/me
router.get("/me", authenticateToken, async (req, res) => {
  try {
    const profile = await fetchProfileByUserId(req.user.id)
    if (!profile) {
      return res.status(404).json({ error: "Personal profile not found" })
    }
    res.json({ profile })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: "Server error" })
  }
})

// PUT /user-personal/me (upsert)
router.put("/me", authenticateToken, userPersonalValidation, async (req, res) => {
  try {
    const db = getDb()
    const { sex, height, goal, nutritionPlanId, workoutPlanId } = req.body
    const { sql, params } = buildUpsert({
      userId: req.user.id,
      data: { sex, height, goal, nutritionPlanId, workoutPlanId },
    })

    if (!sql) {
      return res.status(400).json({ error: "No valid updates provided" })
    }

    const { rows } = await db.query(sql, params)
    res.status(rows[0]?.id ? 200 : 200).json({ profile: rows[0] })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: "Server error" })
  }
})

// GET /user-personal/:userId (admin, trainer)
router.get(
  "/:userId",
  authenticateToken,
  requireRole(["admin", "trainer"]),
  async (req, res) => {
    try {
      const userId = Number.parseInt(req.params.userId, 10)
      const profile = await fetchProfileByUserId(userId)
      if (!profile) {
        return res.status(404).json({ error: "Personal profile not found" })
      }
      res.json({ profile })
    } catch (err) {
      console.error(err)
      res.status(500).json({ error: "Server error" })
    }
  },
)

// PUT /user-personal/:userId (admin only)
router.put(
  "/:userId",
  authenticateToken,
  requireRole(["admin", "trainer"]),
  userPersonalValidation,
  async (req, res) => {
    try {
      const db = getDb()
      const userId = Number.parseInt(req.params.userId, 10)
      const { sex, height, goal, nutritionPlanId, workoutPlanId } = req.body

        // Ensure the user exists (optional but mirrors original logic)
      const userCheck = await db.query(`SELECT id FROM users WHERE id = $1`, [userId])
      if (userCheck.rowCount === 0) {
        return res.status(404).json({ error: "User not found" })
      }

      const { sql, params } = buildUpsert({
        userId,
        data: { sex, height, goal, nutritionPlanId, workoutPlanId },
      })

      if (!sql) {
        return res.status(400).json({ error: "No valid updates provided" })
      }

      const { rows } = await db.query(sql, params)
      const created = rows[0]
      // If you want to distinguish create vs update, you can check existence first.
      res.status(200).json({ profile: created })
    } catch (err) {
      console.error(err)
      res.status(500).json({ error: "Server error" })
    }
  },
)

module.exports = router
