const express = require("express")
const { authenticateToken, requireRole } = require("../middleware/auth")
const db = require("../config/database")
const router = express.Router()


// GET /meals - List meals
router.get("/", authenticateToken, async (req, res) => {
  try {
    const {
      kcalMin,
      kcalMax,
      proteinMin,
      proteinMax,
      carbsMin,
      carbsMax,
      fatMin,
      fatMax,
      search,
      page = 1,
      limit = 10,
    } = req.query

    const offset = (page - 1) * limit

    let query = "SELECT * FROM meals WHERE 1=1"
    const params = []
    let paramCount = 0

    // Calorie filters
    if (kcalMin) {
      paramCount++
      query += ` AND calories >= $${paramCount}`
      params.push(Number.parseFloat(kcalMin))
    }
    if (kcalMax) {
      paramCount++
      query += ` AND calories <= $${paramCount}`
      params.push(Number.parseFloat(kcalMax))
    }

    // Protein filters
    if (proteinMin) {
      paramCount++
      query += ` AND protein >= $${paramCount}`
      params.push(Number.parseFloat(proteinMin))
    }
    if (proteinMax) {
      paramCount++
      query += ` AND protein <= $${paramCount}`
      params.push(Number.parseFloat(proteinMax))
    }

    // Carbohydrate filters
    if (carbsMin) {
      paramCount++
      query += ` AND carbohydrates >= $${paramCount}`
      params.push(Number.parseFloat(carbsMin))
    }
    if (carbsMax) {
      paramCount++
      query += ` AND carbohydrates <= $${paramCount}`
      params.push(Number.parseFloat(carbsMax))
    }

    // Fat filters
    if (fatMin) {
      paramCount++
      query += ` AND fat >= $${paramCount}`
      params.push(Number.parseFloat(fatMin))
    }
    if (fatMax) {
      paramCount++
      query += ` AND fat <= $${paramCount}`
      params.push(Number.parseFloat(fatMax))
    }

    // Search filter
    if (search) {
      paramCount++
      query += ` AND (title ILIKE $${paramCount} OR description ILIKE $${paramCount})`
      params.push(`%${search}%`)
    }

    query += " ORDER BY title"

    paramCount++
    query += ` LIMIT $${paramCount}`
    params.push(limit)

    paramCount++
    query += ` OFFSET $${paramCount}`
    params.push(offset)

    const result = await db.query(query, params)

    res.json({
      data: result.rows,
      pagination: {
        page: Number.parseInt(page),
        limit: Number.parseInt(limit),
        total: result.rows.length,
      },
    })
  } catch (error) {
    console.error("Error fetching meals:", error)
    res.status(500).json({ error: "Internal server error" })
  }
})

// GET /meals/:id - Get meal by ID
router.get("/:id", authenticateToken, async (req, res) => {
  try {
    const { id } = req.params

    const result = await db.query("SELECT * FROM meals WHERE id = $1", [id])

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Meal not found" })
    }

    res.json(result.rows[0])
  } catch (error) {
    console.error("Error fetching meal:", error)
    res.status(500).json({ error: "Internal server error" })
  }
})

// POST /meals - Create meal
router.post("/", authenticateToken, requireRole(["trainer", "admin"]), async (req, res) => {
  try {
    const { title, image, description, calories, protein, carbohydrates, fat } = req.body

    const query = `
      INSERT INTO meals (title, image, description, calories, protein, carbohydrates, fat)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *
    `

    const result = await db.query(query, [title, image, description, calories, protein, carbohydrates, fat])
    res.status(201).json(result.rows[0])
  } catch (error) {
    console.error("Error creating meal:", error)
    res.status(500).json({ error: "Internal server error" })
  }
})

// PUT /meals/:id - Update meal
router.put("/:id", authenticateToken, requireRole(["trainer", "admin"]), async (req, res) => {
  try {
    const { id } = req.params
    const { title, image, description, calories, protein, carbohydrates, fat } = req.body

    // Check if meal exists
    const checkResult = await db.query("SELECT * FROM meals WHERE id = $1", [id])
    if (checkResult.rows.length === 0) {
      return res.status(404).json({ error: "Meal not found" })
    }

    const query = `
      UPDATE meals 
      SET title = $1, image = $2, description = $3, calories = $4, protein = $5, carbohydrates = $6, fat = $7
      WHERE id = $8
      RETURNING *
    `

    const result = await db.query(query, [title, image, description, calories, protein, carbohydrates, fat, id])
    res.json(result.rows[0])
  } catch (error) {
    console.error("Error updating meal:", error)
    res.status(500).json({ error: "Internal server error" })
  }
})

// DELETE /meals/:id - Delete meal
router.delete("/:id", authenticateToken, requireRole(["trainer", "admin"]), async (req, res) => {
  try {
    const { id } = req.params

    // Check if meal exists
    const checkResult = await db.query("SELECT * FROM meals WHERE id = $1", [id])
    if (checkResult.rows.length === 0) {
      return res.status(404).json({ error: "Meal not found" })
    }

    await db.query("DELETE FROM meals WHERE id = $1", [id])
    res.status(204).send()
  } catch (error) {
    console.error("Error deleting meal:", error)
    res.status(500).json({ error: "Internal server error" })
  }
})

module.exports = router
