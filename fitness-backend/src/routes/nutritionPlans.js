const express = require("express")
const { authenticateToken, requireRole } = require("../middleware/auth")
const db = require("../config/database")
const router = express.Router()



// GET /nutrition-plans - List nutrition plans
router.get("/", authenticateToken, async (req, res) => {
  try {
    const { goal, authorId, search, include, page = 1, limit = 1000 } = req.query
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
// router.get("/:id", authenticateToken, async (req, res) => {
//   try {
//     const { id } = req.params
//     const { include } = req.query
//     console.log(id)

//     let query = `
//       SELECT np.*, u.name as author_name, u.email as author_email
//       FROM nutrition_plans np
//       LEFT JOIN users u ON np.author_id = u.id
//       WHERE np.id = $1
//     `
//     const params = [id]

//     // Authorization check
//     if (req.user.role === "user") {
//       query += ` AND np.author_id = $2`
//       params.push(req.user.id)
//     }

//     const result = await db.query(query, params)

//     if (result.rows.length === 0) {
//       return res.status(404).json({ error: "Nutrition plan not found" })
//     }

//     const plan = result.rows[0]

//     // Include related data if requested
//     if (include) {
//       const includes = include.split(",")

//       if (includes.includes("meals")) {
//         const mealsQuery = `
//           SELECT npmp.*, m.title, m.image, m.description, m.calories, m.protein, m.carbohydrates, m.fat
//           FROM nutrition_plan_meal_pivot npmp
//           JOIN meals m ON npmp.meal_id = m.id
//           WHERE npmp.nutrition_plan_id = $1
//         `
//         const mealsResult = await db.query(mealsQuery, [id])
//         plan.meals = mealsResult.rows
//       }
//     }

//     res.json(plan)
//   } catch (error) {
//     console.error("Error fetching nutrition plan:", error)
//     res.status(500).json({ error: "Internal server error" })
//   }
// })
router.get("/:id", authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { include } = req.query;

    const planResult = await db.query(
      `SELECT np.*, u.name AS author_name, u.email AS author_email
       FROM nutrition_plans np
       LEFT JOIN users u ON np.author_id = u.id
       WHERE np.id = $1`,
      [id]
    );

    if (planResult.rows.length === 0) {
      return res.status(404).json({ error: "Nutrition plan not found" });
    }

    const plan = planResult.rows[0];

    // НЯМА авторизационна проверка тук – всички логнати имат достъп

    if (typeof include === "string") {
      const includes = include.split(",");
      if (includes.includes("meals")) {
        const mealsResult = await db.query(
          `SELECT npmp.*, m.title, m.image, m.description, m.calories, m.protein, m.carbohydrates, m.fat
           FROM nutrition_plan_meal_pivot npmp
           JOIN meals m ON npmp.meal_id = m.id
           WHERE npmp.nutrition_plan_id = $1`,
          [id]
        );
        plan.meals = mealsResult.rows;
      }
    }

    return res.json(plan);
  } catch (error) {
    console.error("Error fetching nutrition plan:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
});

// routes/nutrition-plans.js
// router.get("/:id/schedule", authenticateToken, async (req, res) => {
//   try {
//     const { id } = req.params;

//     // 1) Вземи самия план (без ограничения по author_id, щом всички логнати имат достъп)
//     const planRes = await db.query(
//       `SELECT np.*, u.name AS author_name, u.email AS author_email
//        FROM nutrition_plans np
//        LEFT JOIN users u ON np.author_id = u.id
//        WHERE np.id = $1`,
//       [id]
//     );
//     if (planRes.rows.length === 0) {
//       return res.status(404).json({ error: "Nutrition plan not found" });
//     }
//     const nutritionPlan = planRes.rows[0];

//     // 2) Вземи всички pivot-и + meal детайли за този план
//     const rowsRes = await db.query(
//       `SELECT 
//          npmp.id,
//          npmp.position,
//          npmp.quantity,
//          npmp.quantity_kg AS "quantityKg",
//          COALESCE(npmp.schedule, '[]'::jsonb) AS schedule,
//          m.id AS "mealId",
//          m.title,
//          m.image,
//          m.description,
//          m.calories::float  AS calories,
//          m.protein::float   AS protein,
//          m.carbohydrates::float AS carbohydrates,
//          m.fat::float       AS fat
//        FROM nutrition_plan_meal_pivot npmp
//        JOIN meals m ON m.id = npmp.meal_id
//        WHERE npmp.nutrition_plan_id = $1
//        ORDER BY npmp.position ASC, npmp.id ASC`,
//       [id]
//     );

//     // 3) Построй schedule обект: { Mon: [], Tue: [], ... }
//     const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
//     const schedule = Object.fromEntries(days.map((d) => [d, []]));

//     for (const r of rowsRes.rows) {
//       // pivot със вложен meal (camelCase за фронта)
//       const pivot = {
//         id: r.id,
//         position: r.position,
//         quantity: r.quantity,
//         quantityKg: r.quantityKg,
//         schedule: r.schedule, // масив [{ day: 'Mon', time: '08:00' }, ...]
//         meal: {
//           id: r.mealId,
//           title: r.title,
//           image: r.image,
//           description: r.description,
//           calories: r.calories,
//           protein: r.protein,
//           carbohydrates: r.carbohydrates,
//           fat: r.fat,
//         },
//       };

//       // добави ПООТДЕЛНО по ден (по веднъж на ден, дори да има няколко часа в същия ден)
//       const uniqueDays = new Set((r.schedule || []).map((s) => s.day));
//       for (const d of uniqueDays) {
//         if (schedule[d]) schedule[d].push(pivot);
//       }
//     }

//     return res.json({ nutritionPlan, schedule });
//   } catch (error) {
//     console.error("Error fetching nutrition schedule:", error);
//     return res.status(500).json({ error: "Internal server error" });
//   }
// });
// GET /nutrition-plans/:id/schedule
router.get("/:id/schedule", authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;

    const planRes = await db.query(
      `SELECT np.*, u.name AS author_name, u.email AS author_email
       FROM nutrition_plans np
       LEFT JOIN users u ON u.id = np.author_id
       WHERE np.id = $1`,
      [id]
    );
    if (planRes.rows.length === 0) {
      return res.status(404).json({ error: "Nutrition plan not found" });
    }
    const nutritionPlan = planRes.rows[0];

    const rowsRes = await db.query(
      `SELECT 
         npmp.id,
         npmp.position,
         npmp.quantity,
         npmp.quantity_kg AS "quantityKg",
         COALESCE(npmp.schedule, '[]'::jsonb) AS schedule,
         m.id AS "mealId",
         m.title,
         m.image,
         m.description,
         m.calories::float  AS calories,
         m.protein::float   AS protein,
         m.carbohydrates::float AS carbohydrates,
         m.fat::float       AS fat
       FROM nutrition_plan_meal_pivot npmp
       JOIN meals m ON m.id = npmp.meal_id
       WHERE npmp.nutrition_plan_id = $1
       ORDER BY npmp.position ASC, npmp.id ASC`,
      [id]
    );

    const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
    const schedule = Object.fromEntries(days.map((d) => [d, []]));

    const zero = () => ({ calories: 0, protein: 0, carbohydrates: 0, fat: 0 });
    const byDay = Object.fromEntries(days.map((d) => [d, zero()]));
    const week = zero();

    const pushMacros = (acc, add) => {
      acc.calories += add.calories;
      acc.protein += add.protein;
      acc.carbohydrates += add.carbohydrates;
      acc.fat += add.fat;
    };

    for (const r of rowsRes.rows) {
      const multiplier =
        r.quantity != null ? Number(r.quantity) :
        r.quantityKg != null ? Number(r.quantityKg) : 1;

      const calc = {
        calories: (r.calories || 0) * multiplier,
        protein: (r.protein || 0) * multiplier,
        carbohydrates: (r.carbohydrates || 0) * multiplier,
        fat: (r.fat || 0) * multiplier,
      };

      const pivot = {
        id: r.id,
        position: r.position,
        quantity: r.quantity,
        quantityKg: r.quantityKg,
        schedule: r.schedule, // [{day,time},...]
        meal: {
          id: r.mealId,
          title: r.title,
          image: r.image,
          description: r.description,
          calories: r.calories,
          protein: r.protein,
          carbohydrates: r.carbohydrates,
          fat: r.fat,
        },
        // изчислени макроси според quantity/quantityKg
        calc,
      };

      // включи pivot по ден (без дублиране на карта; часовете ще са баджове)
      const uniqueDays = new Set((r.schedule || []).map((s) => s.day));
      for (const d of uniqueDays) {
        if (schedule[d]) {
          schedule[d].push(pivot);
          pushMacros(byDay[d], calc);
        }
      }
      pushMacros(week, calc);
    }

    return res.json({ nutritionPlan, schedule, totals: { byDay, week } });
  } catch (e) {
    console.error("Error fetching nutrition schedule:", e);
    return res.status(500).json({ error: "Internal server error" });
  }
});



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

// router.post("/:id/meals", authenticateToken, requireRole(["trainer", "admin"]), async (req, res) => {
//   try {
//     const { id } = req.params;
//     const { mealId, quantity, quantityKg, schedule, position } = req.body;

//     // 1) Валидации на входа
//     if (!mealId) return res.status(400).json({ error: "mealId is required" });

//     const hasQty = quantity !== undefined && quantity !== null;
//     const hasQtyKg = quantityKg !== undefined && quantityKg !== null;
//     if ((hasQty ? 1 : 0) + (hasQtyKg ? 1 : 0) !== 1) {
//       return res.status(400).json({ error: "Provide exactly one of quantity or quantityKg" });
//     }

//     if (schedule !== undefined && !Array.isArray(schedule)) {
//       return res.status(400).json({ error: "schedule must be an array of { day, time }" });
//     }

//     // 2) Проверка за план и достъп
//     const planQuery =
//       req.user.role === "admin"
//         ? "SELECT id FROM nutrition_plans WHERE id = $1"
//         : "SELECT id FROM nutrition_plans WHERE id = $1 AND author_id = $2";

//     const planParams = req.user.role === "admin" ? [id] : [id, req.user.id];
//     const planResult = await db.query(planQuery, planParams);
//     if (planResult.rows.length === 0) {
//       return res.status(404).json({ error: "Nutrition plan not found or access denied" });
//     }

//     // 3) Проверка за meal
//     const mealResult = await db.query("SELECT id FROM meals WHERE id = $1", [mealId]);
//     if (mealResult.rows.length === 0) {
//       return res.status(404).json({ error: "Meal not found" });
//     }

//     await db.query("BEGIN");

//     // 4) Определяне на position: или ползвай подаденото, или сметни MAX+1
//     let finalPosition = position;
//     if (finalPosition === undefined || finalPosition === null) {
//       const { rows } = await db.query(
//         `SELECT COALESCE(MAX(position), 0) + 1 AS next_pos
//          FROM nutrition_plan_meal_pivot
//          WHERE nutrition_plan_id = $1`,
//         [id]
//       );
//       finalPosition = rows[0].next_pos;
//     } else {
//       if (!(Number.isInteger(finalPosition) && finalPosition > 0)) {
//         await db.query("ROLLBACK");
//         return res.status(400).json({ error: "position must be a positive integer" });
//       }
//     }

//     // 5) INSERT (вече включва position)
//     const insertSql = `
//       INSERT INTO nutrition_plan_meal_pivot
//         (nutrition_plan_id, meal_id, position, quantity, quantity_kg, schedule)
//       VALUES ($1, $2, $3, $4, $5, $6)
//       RETURNING *;
//     `;

//     const params = [
//       id,
//       mealId,
//       finalPosition,
//       hasQty ? quantity : null,
//       hasQtyKg ? quantityKg : null,
//       schedule !== undefined ? JSON.stringify(schedule) : null,
//     ];

//     const result = await db.query(insertSql, params);

//     await db.query("COMMIT");
//     return res.status(201).json(result.rows[0]);
//   } catch (error) {
//     await db.query("ROLLBACK");
//     if (error.code === "23505") {
//       // UNIQUE (nutrition_plan_id, meal_id, position)
//       return res.status(409).json({ error: "This meal with this position already exists in the plan" });
//     }
//     console.error("Error adding meal to nutrition plan:", error);
//     return res.status(500).json({ error: "Internal server error" });
//   }
// });

router.post("/:id/meals", authenticateToken, requireRole(["trainer", "admin"]), async (req, res) => {
  try {
    const { id } = req.params;
    const { mealId, quantity, quantityKg, schedule, position } = req.body;

    // 1) Input validations
    if (!mealId) return res.status(400).json({ error: "mealId is required" });

    const hasQty = quantity !== undefined && quantity !== null && quantity !== "";
    const hasQtyKg = quantityKg !== undefined && quantityKg !== null && quantityKg !== "";

    // allow one OR both, but require at least one
    if (!hasQty && !hasQtyKg) {
      return res.status(400).json({ error: "Provide at least one of quantity or quantityKg" });
    }

    // optional: numeric & positive checks (if provided)
    const qtyVal = hasQty ? Number(quantity) : null;
    const qtyKgVal = hasQtyKg ? Number(quantityKg) : null;

    if (hasQty && (!Number.isFinite(qtyVal) || qtyVal <= 0)) {
      return res.status(400).json({ error: "quantity must be a positive number" });
    }
    if (hasQtyKg && (!Number.isFinite(qtyKgVal) || qtyKgVal <= 0)) {
      return res.status(400).json({ error: "quantityKg must be a positive number" });
    }

    if (schedule !== undefined && !Array.isArray(schedule)) {
      return res.status(400).json({ error: "schedule must be an array of { day, time }" });
    }

    // 2) Check plan & access
    const planQuery =
      req.user.role === "admin"
        ? "SELECT id FROM nutrition_plans WHERE id = $1"
        : "SELECT id FROM nutrition_plans WHERE id = $1 AND author_id = $2";

    const planParams = req.user.role === "admin" ? [id] : [id, req.user.id];
    const planResult = await db.query(planQuery, planParams);
    if (planResult.rows.length === 0) {
      return res.status(404).json({ error: "Nutrition plan not found or access denied" });
    }

    // 3) Check meal exists
    const mealResult = await db.query("SELECT id FROM meals WHERE id = $1", [mealId]);
    if (mealResult.rows.length === 0) {
      return res.status(404).json({ error: "Meal not found" });
    }

    await db.query("BEGIN");

    // 4) Determine position (use provided or compute MAX+1)
    let finalPosition = position;
    if (finalPosition === undefined || finalPosition === null) {
      const { rows } = await db.query(
        `SELECT COALESCE(MAX(position), 0) + 1 AS next_pos
         FROM nutrition_plan_meal_pivot
         WHERE nutrition_plan_id = $1`,
        [id]
      );
      finalPosition = rows[0].next_pos;
    } else {
      if (!(Number.isInteger(finalPosition) && finalPosition > 0)) {
        await db.query("ROLLBACK");
        return res.status(400).json({ error: "position must be a positive integer" });
      }
    }

    // 5) INSERT (supports quantity, quantityKg, or both)
    const insertSql = `
      INSERT INTO nutrition_plan_meal_pivot
        (nutrition_plan_id, meal_id, position, quantity, quantity_kg, schedule)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *;
    `;

    const params = [
      id,
      mealId,
      finalPosition,
      hasQty ? qtyVal : null,
      hasQtyKg ? qtyKgVal : null,
      schedule !== undefined ? JSON.stringify(schedule) : null,
    ];

    const result = await db.query(insertSql, params);

    await db.query("COMMIT");
    return res.status(201).json(result.rows[0]);
  } catch (error) {
    await db.query("ROLLBACK");
    if (error.code === "23505") {
      // UNIQUE (nutrition_plan_id, meal_id, position)
      return res.status(409).json({ error: "This meal with this position already exists in the plan" });
    }
    console.error("Error adding meal to nutrition plan:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
});






module.exports = router
