const express = require("express")
const { authenticateToken, requireRole } = require("../middleware/auth")
const db = require("../config/database")
const router = express.Router()



// PUT /nutrition-plan-meals/:pivotId - Update nutrition plan meal pivot
router.put("/:pivotId", authenticateToken, requireRole(["trainer", "admin"]), async (req, res) => {
  try {
    const { pivotId } = req.params
    const { quantity, quantityKg, schedule } = req.body

    // Check if pivot exists and user has permission
    const checkQuery =
      req.user.role === "admin"
        ? `SELECT npmp.* FROM nutrition_plan_meal_pivot npmp WHERE npmp.id = $1`
        : `SELECT npmp.* FROM nutrition_plan_meal_pivot npmp
         JOIN nutrition_plans np ON npmp.nutrition_plan_id = np.id
         WHERE npmp.id = $1 AND np.author_id = $2`

    const checkParams = req.user.role === "admin" ? [pivotId] : [pivotId, req.user.id]
    const checkResult = await db.query(checkQuery, checkParams)

    if (checkResult.rows.length === 0) {
      return res.status(404).json({ error: "Nutrition plan meal not found or access denied" })
    }

    const query = `
      UPDATE nutrition_plan_meal_pivot 
      SET quantity = $1, quantity_kg = $2, schedule = $3
      WHERE id = $4
      RETURNING *
    `

    const result = await db.query(query, [quantity, quantityKg, JSON.stringify(schedule), pivotId])
    res.json(result.rows[0])
  } catch (error) {
    console.error("Error updating nutrition plan meal:", error)
    res.status(500).json({ error: "Internal server error" })
  }
})

// DELETE /nutrition-plan-meals/:pivotId - Remove meal from nutrition plan
router.delete("/:pivotId", authenticateToken, requireRole(["trainer", "admin"]), async (req, res) => {
  try {
    const { pivotId } = req.params

    // Check if pivot exists and user has permission
    const checkQuery =
      req.user.role === "admin"
        ? `SELECT npmp.* FROM nutrition_plan_meal_pivot npmp WHERE npmp.id = $1`
        : `SELECT npmp.* FROM nutrition_plan_meal_pivot npmp
         JOIN nutrition_plans np ON npmp.nutrition_plan_id = np.id
         WHERE npmp.id = $1 AND np.author_id = $2`

    const checkParams = req.user.role === "admin" ? [pivotId] : [pivotId, req.user.id]
    const checkResult = await db.query(checkQuery, checkParams)

    if (checkResult.rows.length === 0) {
      return res.status(404).json({ error: "Nutrition plan meal not found or access denied" })
    }

    await db.query("DELETE FROM nutrition_plan_meal_pivot WHERE id = $1", [pivotId])
    res.status(204).send()
  } catch (error) {
    console.error("Error removing meal from nutrition plan:", error)
    res.status(500).json({ error: "Internal server error" })
  }
})

module.exports = router
