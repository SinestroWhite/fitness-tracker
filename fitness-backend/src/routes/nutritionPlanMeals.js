const express = require("express")
const { authenticateToken, requireRole } = require("../middleware/auth")
const db = require("../config/database")
const router = express.Router()



// PUT /nutrition-plan-meals/:pivotId - Update nutrition plan meal pivot
// router.put("/:pivotId", authenticateToken, requireRole(["trainer", "admin"]), async (req, res) => {
//   try {
//     const { pivotId } = req.params
//     const { quantity, quantityKg, schedule } = req.body

//     // Check if pivot exists and user has permission
//     const checkQuery =
//       req.user.role === "admin"
//         ? `SELECT npmp.* FROM nutrition_plan_meal_pivot npmp WHERE npmp.id = $1`
//         : `SELECT npmp.* FROM nutrition_plan_meal_pivot npmp
//          JOIN nutrition_plans np ON npmp.nutrition_plan_id = np.id
//          WHERE npmp.id = $1 AND np.author_id = $2`

//     const checkParams = req.user.role === "admin" ? [pivotId] : [pivotId, req.user.id]
//     const checkResult = await db.query(checkQuery, checkParams)

//     if (checkResult.rows.length === 0) {
//       return res.status(404).json({ error: "Nutrition plan meal not found or access denied" })
//     }

//     const query = `
//       UPDATE nutrition_plan_meal_pivot 
//       SET quantity = $1, quantity_kg = $2, schedule = $3
//       WHERE id = $4
//       RETURNING *
//     `

//     const result = await db.query(query, [quantity, quantityKg, JSON.stringify(schedule), pivotId])
//     res.json(result.rows[0])
//   } catch (error) {
//     console.error("Error updating nutrition plan meal:", error)
//     res.status(500).json({ error: "Internal server error" })
//   }
// })
router.put("/:pivotId", authenticateToken, requireRole(["trainer", "admin"]), async (req, res) => {
  try {
    const { pivotId } = req.params
    const { mealId, quantity, quantityKg, schedule } = req.body

    // 1) Достъп/собственост
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

    // 2) Подготовка на partial update
    // type Updatable = {
    //   column: string
    //   value: any
    //   transform?: (v: any) => any
    // }

    const updates = []

    // mealId -> meal_id (по избор валидирай, че съществува)
    if (mealId !== undefined) {
      const parsedMealId = Number(mealId)
      if (!Number.isFinite(parsedMealId)) {
        return res.status(400).json({ error: "mealId must be a number" })
      }

      // (по желание) валидация, че meal съществува:
      const mealCheck = await db.query(`SELECT id FROM meals WHERE id = $1`, [parsedMealId])
      if (mealCheck.rowCount === 0) {
        return res.status(400).json({ error: "Provided mealId does not exist" })
      }

      updates.push({ column: "meal_id", value: parsedMealId })
    }

    if (quantity !== undefined) {
      const q = Number(quantity)
      if (!Number.isFinite(q) || q < 0) {
        return res.status(400).json({ error: "quantity must be a non-negative number" })
      }
      updates.push({ column: "quantity", value: q })
    }

    if (quantityKg !== undefined) {
      const qkg = Number(quantityKg)
      if (!Number.isFinite(qkg) || qkg < 0) {
        return res.status(400).json({ error: "quantityKg must be a non-negative number" })
      }
      updates.push({ column: "quantity_kg", value: qkg })
    }

    if (schedule !== undefined) {
      // базова валидация на графика
      const allowedDays = new Set(["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"])
      if (!Array.isArray(schedule)) {
        return res.status(400).json({ error: "schedule must be an array" })
      }
      for (const s of schedule) {
        if (!s || !allowedDays.has(s.day) || typeof s.time !== "string") {
          return res.status(400).json({ error: "Invalid schedule item" })
        }
      }
      updates.push({ column: "schedule", value: JSON.stringify(schedule) })
    }

    if (updates.length === 0) {
      // нищо за ъпдейт
      return res.json(checkResult.rows[0])
    }

    // 3) Динамичен UPDATE
    const setClauses= []
    const values = []
    updates.forEach((u, idx) => {
      setClauses.push(`${u.column} = $${idx + 1}`)
      values.push(u.value)
    })
    values.push(pivotId) // последен параметър за WHERE

    const updateSql = `
      UPDATE nutrition_plan_meal_pivot
      SET ${setClauses.join(", ")}
      WHERE id = $${values.length}
      RETURNING *
    `
    const result = await db.query(updateSql, values)
    return res.json(result.rows[0])
  } catch (error) {
    console.error("Error updating nutrition plan meal:", error)
    return res.status(500).json({ error: "Internal server error" })
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
