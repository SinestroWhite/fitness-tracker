const express = require("express");
const { getDb } = require("../config/database");
const { authenticateToken, requireRole, requireOwnershipOrRole } = require("../middleware/auth");
const { updateUserValidation, paginationValidation } = require("../middleware/validation");
const bcrypt = require("bcryptjs");

const router = express.Router();

// Whitelist mapping for ORDER BY safety
const SORT_FIELDS = {
  id: "id",
  email: "email",
  name: "name",
  role: "role",
  created_at: `"created_at"`, // FIX: правилно име на колоната
};
const SORT_ORDERS = { asc: "ASC", desc: "DESC" };

// GET /users/me
router.get("/me", authenticateToken, async (req, res, next) => {
  const db = getDb();
  try {
    const { rows } = await db.query(
      `SELECT id, email, name, role, status, blocked_until, blocked_reason, "created_at"
       FROM users WHERE id = $1`,
      [req.user.id],
    );
    const user = rows[0];
    if (!user) return res.status(404).json({ error: "User not found" });
    res.json({ user });
  } catch (err) {
    next(err);
  }
});

// PUT /users/me
router.put("/me", authenticateToken, updateUserValidation, async (req, res, next) => {
  const db = getDb();
  try {
    const { name, email } = req.body;

    const updates = [];
    const params = [];
    let p = 1;

    if (name) {
      updates.push(`name = $${p++}`);
      params.push(name);
    }
    if (email) {
      updates.push(`email = $${p++}`);
      params.push(email);
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: "No valid updates provided" });
    }

    params.push(req.user.id);

    const updateSql = `UPDATE users SET ${updates.join(", ")} WHERE id = $${p}`;
    await db.query(updateSql, params);

    const { rows } = await db.query(
      `SELECT id, email, name, role, status, blocked_until, blocked_reason, "created_at"
       FROM users WHERE id = $1`,
      [req.user.id],
    );
    res.json({ user: rows[0] });
  } catch (err) {
    if (err.code === "23505") {
      return res.status(409).json({ error: "Имейл адресът вече съществува" });
    }
    next(err);
  }
});

// GET /users (admin only)
router.get("/", authenticateToken, requireRole(["admin"]), paginationValidation, async (req, res, next) => {
  const db = getDb();
  try {
    const page = Number.parseInt(req.query.page ?? 1, 10);
    const pageSize = Number.parseInt(req.query.pageSize ?? 20, 10);
    const { role, email, status } = req.query;
    const sortRaw = (req.query.sort ?? "created_at:desc").toString();

    // Build filters
    const where = [];
    const params = [];
    let p = 1;

    if (role) {
      where.push(`role = $${p++}`);
      params.push(role);
    }
    if (email) {
      where.push(`email ILIKE $${p++}`);
      params.push(`%${email}%`);
    }
    if (status) {
      where.push(`status = $${p++}`);
      params.push(status);
    }

    const whereClause = where.length ? `WHERE ${where.join(" AND ")}` : "";

    // Build sort (whitelisted)
    const [sortFieldReq, sortOrderReq] = sortRaw.split(":");
    const sortField = SORT_FIELDS[sortFieldReq] ?? `"created_at"`;
    const sortOrder = SORT_ORDERS[(sortOrderReq || "desc").toLowerCase()] ?? "DESC";
    const orderClause = `ORDER BY ${sortField} ${sortOrder}`;

    const offset = (page - 1) * pageSize;

    // Get total count
    const countSql = `SELECT COUNT(*)::int AS total FROM users ${whereClause}`;
    const { rows: countRows } = await db.query(countSql, params);
    const total = countRows[0]?.total ?? 0;

    // Get paged users
    const usersSql = `
      SELECT id, email, name, role, status, blocked_until, blocked_reason, "created_at"
      FROM users
      ${whereClause}
      ${orderClause}
      LIMIT $${p++} OFFSET $${p++}
    `;
    const { rows: users } = await db.query(usersSql, [...params, pageSize, offset]);

    res.json({
      users,
      pagination: {
        page,
        pageSize,
        total,
        totalPages: Math.ceil(total / pageSize),
      },
    });
  } catch (err) {
    next(err);
  }
});

// GET /users/trainers (скрива блокираните)
router.get("/trainers", authenticateToken, paginationValidation, async (req, res, next) => {
  const db = getDb();
  try {
    const { search, sort = "name:asc" } = req.query;

    // pagination (clamped)
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const pageSize = Math.min(100, Math.max(1, parseInt(req.query.pageSize, 10) || 20));
    const offset = (page - 1) * pageSize;

    // sort (whitelisted)
    const [rawField = "name", rawDir = "asc"] = String(sort).split(":");
    const ALLOWED_SORT_FIELDS = {
      name: "u.name",
      email: "u.email",
      created_at: "u.created_at",
      client_count: "client_count",
    };
    const sortField = ALLOWED_SORT_FIELDS[rawField] || ALLOWED_SORT_FIELDS.name;
    const sortOrder = rawDir.toLowerCase() === "desc" ? "DESC" : "ASC";

    // filters
    const params = [];
    let p = 1;
    let where = `
      WHERE u.role = 'trainer'
        AND u.status = 'active'
        AND (u.blocked_until IS NULL OR u.blocked_until <= NOW())
    `;

    if (search) {
      params.push(`%${search}%`, `%${search}%`);
      where += ` AND (u.name ILIKE $${p++} OR u.email ILIKE $${p++})`;
    }

    // total count
    const countSql = `SELECT COUNT(*)::int AS total FROM users u ${where}`;
    const { rows: countRows } = await db.query(countSql, params);
    const total = countRows[0]?.total ?? 0;

    // list page with client_count
    const listSql = `
      SELECT
        u.id,
        u.email,
        u.name,
        u.created_at,
        COUNT(c.id)::int AS client_count
      FROM users u
      LEFT JOIN users c
        ON c.trainer_id = u.id
       AND c.role = 'user'
      ${where}
      GROUP BY u.id, u.email, u.name, u.created_at
      ORDER BY ${sortField} ${sortOrder}
      LIMIT $${p++} OFFSET $${p++}
    `;
    const { rows } = await db.query(listSql, [...params, pageSize, offset]);

    res.json({
      trainers: rows.map(r => ({ ...r, client_count: Number(r.client_count) })),
      pagination: {
        page,
        pageSize,
        total,
        totalPages: Math.ceil(total / pageSize),
      },
    });
  } catch (err) {
    next(err);
  }
});

// GET /users/:id (admin or owner)
router.get("/:id", authenticateToken, requireOwnershipOrRole(["admin"]), async (req, res, next) => {
  const db = getDb();
  try {
    const userId = Number.parseInt(req.params.id, 10);
    const { rows } = await db.query(
      `SELECT id, email, name, role, status, blocked_until, blocked_reason, "created_at"
       FROM users WHERE id = $1`,
      [userId],
    );
    const user = rows[0];
    if (!user) return res.status(404).json({ error: "User not found" });
    res.json({ user });
  } catch (err) {
    next(err);
  }
});

// POST /users (admin only)
router.post("/", authenticateToken, requireRole(["admin"]), updateUserValidation, async (req, res, next) => {
  const db = getDb();
  try {
    const { email, name, role = "user" } = req.body;

    const tempPassword = Math.random().toString(36).slice(-8);
    const passwordHash = await bcrypt.hash(tempPassword, 12);

    const insertSql = `
      INSERT INTO users (email, "password_hash", name, role)
      VALUES ($1, $2, $3, $4)
      RETURNING id, email, name, role, status, blocked_until, blocked_reason, "created_at"
    `;
    const values = [email, passwordHash, name, role];

    const { rows } = await db.query(insertSql, values);
    const user = rows[0];

    res.status(201).json({
      user,
      tempPassword, // В продукция – прати по имейл
    });
  } catch (err) {
    if (err.code === "23505") {
      return res.status(409).json({ error: "Имейл адресът вече съществува" });
    }
    next(err);
  }
});

// PUT /users/:id (admin or owner with restrictions)
router.put("/:id", authenticateToken, requireOwnershipOrRole(["admin"]), updateUserValidation, async (req, res, next) => {
  const db = getDb();
  try {
    const userId = Number.parseInt(req.params.id, 10);
    const { name, email, role } = req.body;

    if (role && req.user.role !== "admin") {
      return res.status(403).json({ error: "Only admins can change roles" });
    }

    const updates = [];
    const params = [];
    let p = 1;

    if (name) {
      updates.push(`name = $${p++}`);
      params.push(name);
    }
    if (email && req.user.role === "admin") {
      updates.push(`email = $${p++}`);
      params.push(email);
    }
    if (role && req.user.role === "admin") {
      updates.push(`role = $${p++}`);
      params.push(role);
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: "No valid updates provided" });
    }

    params.push(userId);

    const updateSql = `UPDATE users SET ${updates.join(", ")} WHERE id = $${p} RETURNING id`;
    const result = await db.query(updateSql, params);

    if (result.rowCount === 0) {
      return res.status(404).json({ error: "User not found" });
    }

    const { rows } = await db.query(
      `SELECT id, email, name, role, status, blocked_until, blocked_reason, "created_at"
       FROM users WHERE id = $1`,
      [userId],
    );
    res.json({ user: rows[0] });
  } catch (err) {
    if (err.code === "23505") {
      return res.status(409).json({ error: "Имейл адресът вече съществува" });
    }
    next(err);
  }
});

// DELETE /users/:id (admin only)
router.delete("/:id", authenticateToken, requireRole(["admin"]), async (req, res, next) => {
  const db = getDb();
  try {
    const userId = Number.parseInt(req.params.id, 10);
    const result = await db.query(`DELETE FROM users WHERE id = $1`, [userId]);
    if (result.rowCount === 0) {
      return res.status(404).json({ error: "User not found" });
    }
    res.json({ message: "User deleted successfully" });
  } catch (err) {
    next(err);
  }
});


// POST /users/:id/block
// body: { reason?: string, until?: string (ISO дата/час) }
router.post("/:id/block", authenticateToken, requireRole(["admin"]), async (req, res, next) => {
  const db = getDb();
  try {
    const targetId = Number.parseInt(req.params.id, 10);
    const { reason, until } = req.body || {};

    if (Number.isNaN(targetId)) {
      return res.status(400).json({ error: "Invalid user id" });
    }
    if (req.user.id === targetId) {
      return res.status(400).json({ error: "Админ не може да блокира себе си" });
    }

    // Вземаме таргета и проверяваме, че не е админ
    const { rows: targetRows } = await db.query(
      `SELECT id, role FROM users WHERE id = $1`,
      [targetId]
    );
    const target = targetRows[0];
    if (!target) return res.status(404).json({ error: "User not found" });
    if (target.role === "admin") {
      return res.status(403).json({ error: "Не може да блокираш администратор" });
    }

    let untilTs = null;
    if (until) {
      const d = new Date(until);
      if (isNaN(d.getTime())) {
        return res.status(400).json({ error: "Невалидна дата за until" });
      }
      untilTs = d.toISOString();
    }

    // Ако има until -> временно блокиране (status остава 'active', но blocked_until действа)
    // Ако няма -> постоянен блок (status='blocked', blocked_until NULL)
    const updateSql = `
      UPDATE users
      SET
        status = CASE WHEN $2::timestamp IS NULL THEN 'blocked' ELSE 'active' END,
        blocked_until = $2::timestamp,
        blocked_reason = $3,
        blocked_by = $4,
        blocked_at = NOW()
      WHERE id = $1
      RETURNING id, email, name, role, status, blocked_until, blocked_reason, "created_at"
    `;
    const { rows } = await db.query(updateSql, [targetId, untilTs, reason || null, req.user.id]);

    // чистим всички refresh токени на потребителя
    await db.query(`DELETE FROM refresh_tokens WHERE user_id = $1`, [targetId]);

    return res.json({ message: "User blocked", user: rows[0] });
  } catch (err) {
    next(err);
  }
});

// POST /users/:id/unblock
router.post("/:id/unblock", authenticateToken, requireRole(["admin"]), async (req, res, next) => {
  const db = getDb();
  try {
    const targetId = Number.parseInt(req.params.id, 10);

    if (Number.isNaN(targetId)) {
      return res.status(400).json({ error: "Invalid user id" });
    }

    const updateSql = `
      UPDATE users
      SET status = 'active',
          blocked_until = NULL,
          blocked_reason = NULL,
          blocked_by = NULL,
          blocked_at = NULL
      WHERE id = $1
      RETURNING id, email, name, role, status, blocked_until, blocked_reason, "created_at"
    `;
    const { rows } = await db.query(updateSql, [targetId]);
    if (!rows[0]) return res.status(404).json({ error: "User not found" });

    return res.json({ message: "User unblocked", user: rows[0] });
  } catch (err) {
    next(err);
  }
});

/** ----------------------------------------------------------- **/

// PUT /users/me/trainer (authenticated users only)
router.put("/me/trainer", authenticateToken, async (req, res) => {
  const { trainerId } = req.body;
  const db = getDb();
  try {
    if (req.user.role !== "user") {
      return res.status(403).json({ error: "Only regular users can select trainers" });
    }

    const client = await db.connect();
    try {
      if (trainerId) {
        // Validate trainer exists & is a trainer and not blocked
        const { rows } = await client.query(
          `SELECT id FROM users
           WHERE id = $1 AND role = 'trainer'
             AND status = 'active'
             AND (blocked_until IS NULL OR blocked_until <= NOW())`,
          [trainerId],
        );
        if (rows.length === 0) {
          return res.status(404).json({ error: "Trainer not found or not available" });
        }

        await client.query("UPDATE users SET trainer_id = $1 WHERE id = $2", [
          trainerId,
          req.user.id,
        ]);

        res.json({ message: "Trainer assigned successfully", trainerId });
      } else {
        await client.query("UPDATE users SET trainer_id = NULL WHERE id = $1", [req.user.id]);
        res.json({ message: "Trainer unassigned successfully" });
      }
    } finally {
      client.release();
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to update trainer assignment" });
  }
});

// GET /users/me/trainer (authenticated users only)
router.get("/me/trainer", authenticateToken, async (req, res) => {
  const db = getDb();
  try {
    const { rows } = await db.query(
      `
      SELECT t.id, t.email, t.name, t.created_at
      FROM users u
      LEFT JOIN users t ON u.trainer_id = t.id
      WHERE u.id = $1
      `,
      [req.user.id],
    );

    const trainer = rows[0];
    if (!trainer || !trainer.id) {
      return res.json({ trainer: null });
    }
    res.json({ trainer });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch assigned trainer" });
  }
});

router.get(
  "/trainer/clients",
  authenticateToken,
  requireRole(["trainer"]),
  paginationValidation,
  async (req, res, next) => {
    const db = getDb();
    try {
      const { page = "1", pageSize = "20", sort = "name:asc" } = req.query;

      const pageNum = Math.max(parseInt(page, 10) || 1, 1);
      const sizeNum = Math.min(Math.max(parseInt(pageSize, 10) || 20, 1), 100);

      const [sortFieldRaw = "name", sortOrderRaw = "asc"] = String(sort).split(":");

      const SORTABLE_FIELDS = new Set(["name", "email", "created_at"]);
      const sortField = SORTABLE_FIELDS.has(sortFieldRaw) ? sortFieldRaw : "name";
      const sortOrder = sortOrderRaw.toLowerCase() === "desc" ? "DESC" : "ASC";

      const offset = (pageNum - 1) * sizeNum;

      const countSql = `
        SELECT COUNT(*)::int AS total
        FROM users
        WHERE trainer_id = $1 AND role = 'user'
      `;
      const { rows: countRows } = await db.query(countSql, [req.user.id]);
      const total = countRows?.[0]?.total ?? 0;

      const dataSql = `
        SELECT id, email, name, role, created_at
        FROM users
        WHERE trainer_id = $1 AND role = 'user'
        ORDER BY ${sortField} ${sortOrder}
        LIMIT $2 OFFSET $3
      `;
      const { rows: clients } = await db.query(dataSql, [req.user.id, sizeNum, offset]);

      res.json({
        clients,
        pagination: {
          page: pageNum,
          pageSize: sizeNum,
          total,
          totalPages: Math.ceil(total / sizeNum),
        },
      });
    } catch (err) {
      next(err);
    }
  }
);

router.get(
  "/trainer/clients/:id",
  authenticateToken,
  requireRole(["trainer"]),
  async (req, res) => {
    const db = getDb();
    const clientId = Number.parseInt(req.params.id, 10);
    if (Number.isNaN(clientId)) {
      return res.status(400).json({ error: "Invalid client id" });
    }

    try {
      const { rows } = await db.query(
        `
        SELECT
          -- users
          u.id              AS client_id,
          u.email           AS client_email,
          u.name            AS client_name,
          u.role            AS client_role,
          u.trainer_id      AS client_trainer_id,
          u.created_at      AS client_created_at,

          -- user_personal
          up.id             AS personal_id,
          up.user_id        AS personal_user_id,
          up.sex            AS personal_sex,
          up.height         AS personal_height,
          up.goal           AS personal_goal,
          up.nutrition_plan_id AS personal_nutrition_plan_id,
          up.workout_plan_id   AS personal_workout_plan_id,

          -- latest progress (by created_at)
          lp.id             AS progress_id,
          lp.user_id        AS progress_user_id,
          lp.weight_kg      AS progress_weight_kg,
          lp.body_fat       AS progress_body_fat,
          lp.images         AS progress_images,
          lp.created_at     AS progress_created_at

        FROM users u
        LEFT JOIN user_personal up
          ON up.user_id = u.id
        LEFT JOIN LATERAL (
          SELECT p.*
          FROM progress p
          WHERE p.user_id = u.id
          ORDER BY p.created_at DESC
          LIMIT 1
        ) lp ON TRUE
        WHERE u.id = $1
          AND u.trainer_id = $2
          AND u.role = 'user'
        LIMIT 1;
        `,
        [clientId, req.user.id]
      );

      if (rows.length === 0) {
        return res
          .status(404)
          .json({ error: "Client not found or not assigned to you" });
      }

      const r = rows[0];

      const client = {
        id: r.client_id,
        email: r.client_email,
        name: r.client_name,
        role: r.client_role,
        trainer_id: r.client_trainer_id,
        created_at: r.client_created_at,

        // user_personal is optional (LEFT JOIN)
        personalInfo: r.personal_id
          ? {
              id: r.personal_id,
              user_id: r.personal_user_id,
              sex: r.personal_sex,                // 'male' | 'female' | null
              height: r.personal_height,          // DECIMAL(5,2)
              goal: r.personal_goal,              // 'lose' | 'gain' | 'keep' | null
              nutrition_plan_id: r.personal_nutrition_plan_id,
              workout_plan_id: r.personal_workout_plan_id,
            }
          : null,

        // latest progress is optional (no entries yet)
        latestProgress: r.progress_id
          ? {
              id: r.progress_id,
              user_id: r.progress_user_id,
              weight_kg: r.progress_weight_kg,    // DECIMAL(5,2)
              body_fat: r.progress_body_fat,      // DECIMAL(5,2) | null
              images: r.progress_images,          // JSONB | null
              created_at: r.progress_created_at,
            }
          : null,
      };

      return res.json({ client });
    } catch (err) {
      console.error("Error fetching client:", err);
      return res.status(500).json({ error: "Internal server error" });
    }
  }
);


module.exports = router;
