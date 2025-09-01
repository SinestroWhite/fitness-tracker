const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { getDb } = require("../config/database");
const { registerValidation, loginValidation } = require("../middleware/validation");
const { authenticateToken } = require("../middleware/auth");

const router = express.Router();

// Generate tokens
const generateTokens = (user) => {
  const accessToken = jwt.sign(
    { id: user.id, email: user.email, role: user.role, name: user.name },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN }
  );

  const refreshToken = jwt.sign(
    { id: user.id },
    process.env.JWT_REFRESH_SECRET,
    { expiresIn: process.env.JWT_REFRESH_EXPIRES_IN }
  );

  return { accessToken, refreshToken };
};

// POST /auth/register
router.post("/register", registerValidation, async (req, res) => {
  const db = getDb(); // pg Pool or Client
  const client = db.connect ? await db.connect() : db;

  try {
    const { email, password, name } = req.body;

    const passwordHash = await bcrypt.hash(password, 12);

    const insertUserSql = `
      INSERT INTO users (email, password_hash, name)
      VALUES ($1, $2, $3)
      RETURNING id, email, name, role
    `;
    const { rows: userRows } = await client.query(insertUserSql, [email, passwordHash, name]);
    const user = userRows[0];

    const tokens = generateTokens(user);

    await client.query(
      `INSERT INTO refresh_tokens (user_id, token, expires_at)
       VALUES ($1, $2, NOW() + INTERVAL '7 days')`,
      [user.id, tokens.refreshToken]
    );

    return res.status(201).json({
      user: { id: user.id, email: user.email, name: user.name, role: user.role },
      ...tokens,
    });
  } catch (error) {
    if (error && error.code === "23505") {
      // unique_violation (likely email)
      return res.status(409).json({ error: "Имейл адресът вече съществува" });
    }
    console.error(error);
    return res.status(500).json({ error: "Registration failed" });
  } finally {
    if (client.release) client.release();
  }
});

// POST /auth/login
router.post("/login", loginValidation, async (req, res) => {
  const db = getDb();
  const client = db.connect ? await db.connect() : db;

  try {
    const { email, password } = req.body;

    const { rows } = await client.query(
      `SELECT id, email, name, role, password_hash
       FROM users
       WHERE email = $1
       LIMIT 1`,
      [email]
    );

    const user = rows[0];
    if (!user || !(await bcrypt.compare(password, user.password_hash))) {
      return res.status(401).json({ error: "Невалидни идентификационни данни" });
    }

    const tokens = generateTokens(user);

    await client.query(
      `INSERT INTO refresh_tokens (user_id, token, expires_at)
       VALUES ($1, $2, NOW() + INTERVAL '7 days')`,
      [user.id, tokens.refreshToken]
    );

    return res.json({
      user: { id: user.id, email: user.email, name: user.name, role: user.role },
      ...tokens,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Login failed" });
  } finally {
    if (client.release) client.release();
  }
});

// POST /auth/refresh
router.post("/refresh", async (req, res) => {
  const { refreshToken } = req.body;
  if (!refreshToken) return res.status(401).json({ error: "Refresh token required" });

  const db = getDb();
  const client = db.connect ? await db.connect() : db;

  try {
    // Verify JWT first
    try {
      jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);
    } catch {
      return res.status(403).json({ error: "Invalid refresh token" });
    }

    // Check DB for token and expiry
    const { rows: tokenRows } = await client.query(
      `SELECT rt.id, rt.user_id, rt.token, rt.expires_at,
              u.email, u.role
       FROM refresh_tokens rt
       JOIN users u ON u.id = rt.user_id
       WHERE rt.token = $1
         AND rt.expires_at > NOW()
       LIMIT 1`,
      [refreshToken]
    );

    const tokenRecord = tokenRows[0];
    if (!tokenRecord) {
      return res.status(403).json({ error: "Invalid or expired refresh token" });
    }

    const user = { id: tokenRecord.user_id, email: tokenRecord.email, role: tokenRecord.role };
    const tokens = generateTokens(user);

    // Rotate the refresh token
    await client.query(
      `UPDATE refresh_tokens
       SET token = $1, expires_at = NOW() + INTERVAL '7 days'
       WHERE id = $2`,
      [tokens.refreshToken, tokenRecord.id]
    );

    return res.json(tokens);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Token refresh failed" });
  } finally {
    if (client.release) client.release();
  }
});

// POST /auth/logout
router.post("/logout", authenticateToken, async (req, res) => {
  const { refreshToken } = req.body;
  const db = getDb();
  const client = db.connect ? await db.connect() : db;

  try {
    if (refreshToken) {
      await client.query(`DELETE FROM refresh_tokens WHERE token = $1`, [refreshToken]);
    }
    return res.json({ message: "Logged out successfully" });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Logout failed" });
  } finally {
    if (client.release) client.release();
  }
});

module.exports = router;
