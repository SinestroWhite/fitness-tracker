const express = require("express")
const { authenticateToken, requireRole } = require("../middleware/auth")
const db = require("../config/database")
const router = express.Router()



// GET /nutrition-plans - List nutrition plans
router.get("/", authenticateToken, async (req, res) => {
  try {
    const { goal, authorId, search, include, page = 1, limit = 10 } = req.query
    const offset = (page - 1) * limit

    let query = `
      SELECT np.*, u.name as author_name, u.email as author_email
      FROM nutrition_plans np
      LEFT JOIN users u ON np.author_id = u.id
      WHERE 1=1
    `
    const params = []
    let paramCount = 0

    if (goal) {
      paramCount++
      query += ` AND np.goal = $${paramCount}`
      params.push(goal)
    }

    if (authorId) {
      paramCount++
      query += ` AND np.author_id = $${paramCount}`
      params.push(authorId)
    }

    if (search) {
      paramCount++
      query += ` AND (np.title ILIKE $${paramCount} OR np.description ILIKE $${paramCount})`
      params.push(`%${search}%`)
    }

    // Authorization: users can only see their own plans unless they're trainers/admins
    if (req.user.role === "user") {
      paramCount++
      query += ` AND np.author_id = $${paramCount}`
      params.push(req.user.id)
    }

    query += ` ORDER BY np.created_at DESC`

    paramCount++
    query += ` LIMIT $${paramCount}`
    params.push(limit)

    paramCount++
    query += ` OFFSET $${paramCount}`
    params.push(offset)

    const result = await db.query(query, params)
    let plans = result.rows

    // Include related data if requested
    if (include && plans.length > 0) {
      const planIds = plans.map((p) => p.id)
      const includes = include.split(",")

      if (includes.includes("meals")) {
        const mealsQuery = `
          SELECT npmp.*, m.title, m.image, m.calories, m.protein, m.carbohydrates, m.fat
          FROM nutrition_plan_meal_pivot npmp
          JOIN meals m ON npmp.meal_id = m.id
          WHERE npmp.nutrition_plan_id = ANY($1)
        `
        const mealsResult = await db.query(mealsQuery, [planIds])

        plans = plans.map((plan) => ({
          ...plan,
          meals: mealsResult.rows.filter((m) => m.nutrition_plan_id === plan.id),
        }))
      }
    }

    res.json({
      data: plans,
      pagination: {
        page: Number.parseInt(page),
        limit: Number.parseInt(limit),
        total: plans.length,
      },
    })
  } catch (error) {
    console.error("Error fetching nutrition plans:", error)
    res.status(500).json({ error: "Internal server error" })
  }
})

// GET /nutrition-plans/:id - Get nutrition plan by ID
router.get("/:id", authenticateToken, async (req, res) => {
  try {
    const { id } = req.params
    const { include } = req.query

    let query = `
      SELECT np.*, u.name as author_name, u.email as author_email
      FROM nutrition_plans np
      LEFT JOIN users u ON np.author_id = u.id
      WHERE np.id = $1
    `
    const params = [id]

    // Authorization check
    if (req.user.role === "user") {
      query += ` AND np.author_id = $2`
      params.push(req.user.id)
    }

    const result = await db.query(query, params)

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Nutrition plan not found" })
    }

    const plan = result.rows[0]

    // Include related data if requested
    if (include) {
      const includes = include.split(",")

      if (includes.includes("meals")) {
        const mealsQuery = `
          SELECT npmp.*, m.title, m.image, m.description, m.calories, m.protein, m.carbohydrates, m.fat
          FROM nutrition_plan_meal_pivot npmp
          JOIN meals m ON npmp.meal_id = m.id
          WHERE npmp.nutrition_plan_id = $1
        `
        const mealsResult = await db.query(mealsQuery, [id])
        plan.meals = mealsResult.rows
      }
    }

    res.json(plan)
  } catch (error) {
    console.error("Error fetching nutrition plan:", error)
    res.status(500).json({ error: "Internal server error" })
  }
})

// POST /nutrition-plans - Create nutrition plan
router.post("/", authenticateToken, requireRole(["trainer", "admin"]), async (req, res) => {
  try {
    const { title, goal, description } = req.body

    const query = `
      INSERT INTO nutrition_plans (title, goal, description, author_id)
      VALUES ($1, $2, $3, $4)
      RETURNING *
    `

    const result = await db.query(query, [title, goal, description, req.user.id])
    res.status(201).json(result.rows[0])
  } catch (error) {
    console.error("Error creating nutrition plan:", error)
    res.status(500).json({ error: "Internal server error" })
  }
})


// PUT /nutrition-plans/:id - Update nutrition plan
router.put("/:id", authenticateToken, requireRole(["trainer", "admin"]), async (req, res) => {
  try {
    const { id } = req.params
    const { title, goal, description } = req.body

    // Check if plan exists and user has permission
    const checkQuery =
      req.user.role === "admin"
        ? "SELECT * FROM nutrition_plans WHERE id = $1"
        : "SELECT * FROM nutrition_plans WHERE id = $1 AND author_id = $2"

    const checkParams = req.user.role === "admin" ? [id] : [id, req.user.id]
    const checkResult = await db.query(checkQuery, checkParams)

    if (checkResult.rows.length === 0) {
      return res.status(404).json({ error: "Nutrition plan not found or access denied" })
    }

    const query = `
      UPDATE nutrition_plans 
      SET title = $1, goal = $2, description = $3
      WHERE id = $4
      RETURNING *
    `

    const result = await db.query(query, [title, goal, description, id])
    res.json(result.rows[0])
  } catch (error) {
    console.error("Error updating nutrition plan:", error)
    res.status(500).json({ error: "Internal server error" })
  }
})

// DELETE /nutrition-plans/:id - Delete nutrition plan
router.delete("/:id", authenticateToken, requireRole(["trainer", "admin"]), async (req, res) => {
  try {
    const { id } = req.params

    // Check if plan exists and user has permission
    const checkQuery =
      req.user.role === "admin"
        ? "SELECT * FROM nutrition_plans WHERE id = $1"
        : "SELECT * FROM nutrition_plans WHERE id = $1 AND author_id = $2"

    const checkParams = req.user.role === "admin" ? [id] : [id, req.user.id]
    const checkResult = await db.query(checkQuery, checkParams)

    if (checkResult.rows.length === 0) {
      return res.status(404).json({ error: "Nutrition plan not found or access denied" })
    }

    await db.query("DELETE FROM nutrition_plans WHERE id = $1", [id])
    res.status(204).send()
  } catch (error) {
    console.error("Error deleting nutrition plan:", error)
    res.status(500).json({ error: "Internal server error" })
  }
})

// GET /nutrition-plans/:id/meals - Get meals for a nutrition plan
router.get("/:id/meals", authenticateToken, async (req, res) => {
  try {
    const { id } = req.params

    // Check if user has access to this nutrition plan
    const accessQuery =
      req.user.role === "user"
        ? "SELECT id FROM nutrition_plans WHERE id = $1 AND author_id = $2"
        : "SELECT id FROM nutrition_plans WHERE id = $1"

    const accessParams = req.user.role === "user" ? [id, req.user.id] : [id]
    const accessResult = await db.query(accessQuery, accessParams)

    if (accessResult.rows.length === 0) {
      return res.status(404).json({ error: "Nutrition plan not found or access denied" })
    }

    const query = `
      SELECT npmp.*, m.title, m.image, m.description, m.calories, m.protein, m.carbohydrates, m.fat
      FROM nutrition_plan_meal_pivot npmp
      JOIN meals m ON npmp.meal_id = m.id
      WHERE npmp.nutrition_plan_id = $1
      ORDER BY m.title
    `

    const result = await db.query(query, [id])
    res.json(result.rows)
  } catch (error) {
    console.error("Error fetching nutrition plan meals:", error)
    res.status(500).json({ error: "Internal server error" })
  }
})

// POST /nutrition-plans/:id/meals - Add meal to nutrition plan
router.post("/:id/meals", authenticateToken, requireRole(["trainer", "admin"]), async (req, res) => {
  try {
    const { id } = req.params
    const { mealId, quantity, quantityKg, schedule } = req.body

    // Validate required fields
    if (!mealId) {
      return res.status(400).json({ error: "mealId is required" })
    }

    // Check if nutrition plan exists and user has permission
    const planQuery =
      req.user.role === "admin"
        ? "SELECT id FROM nutrition_plans WHERE id = $1"
        : "SELECT id FROM nutrition_plans WHERE id = $1 AND author_id = $2"

    const planParams = req.user.role === "admin" ? [id] : [id, req.user.id]
    const planResult = await db.query(planQuery, planParams)

    if (planResult.rows.length === 0) {
      return res.status(404).json({ error: "Nutrition plan not found or access denied" })
    }

    // Check if meal exists
    const mealResult = await db.query("SELECT id FROM meals WHERE id = $1", [mealId])
    if (mealResult.rows.length === 0) {
      return res.status(404).json({ error: "Meal not found" })
    }

    const query = `
      INSERT INTO nutrition_plan_meal_pivot (nutrition_plan_id, meal_id, quantity, quantity_kg, schedule)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *
    `

    const result = await db.query(query, [id, mealId, quantity, quantityKg, JSON.stringify(schedule)])
    res.status(201).json(result.rows[0])
  } catch (error) {
    if (error.code === "23505") {
      // Unique constraint violation
      return res.status(409).json({ error: "Meal already added to this nutrition plan" })
    }
    console.error("Error adding meal to nutrition plan:", error)
    res.status(500).json({ error: "Internal server error" })
  }
})

module.exports = router
