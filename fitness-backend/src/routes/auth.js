const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { getDb } = require("../config/database");
const { registerValidation, loginValidation } = require("../middleware/validation");
const { authenticateToken } = require("../middleware/auth");
const crypto = require("crypto");
const sgMail = require("@sendgrid/mail");
sgMail.setApiKey(process.env.SENDGRID_API_KEY);

const router = express.Router();
const RESET_TOKEN_EXPIRES_MINUTES = Number(process.env.RESET_TOKEN_EXPIRES_MINUTES || 30);
const isDev = process.env.NODE_ENV !== "production";

function generateResetToken() {
  // 32 bytes -> 64 hex chars. You send this raw token to the user.
  const token = crypto.randomBytes(32).toString("hex");
  const tokenHash = crypto.createHash("sha256").update(token).digest("hex");
  return { token, tokenHash };
}

function logSendGridError(err) {
  if (!err) return;
  if (err.response && err.response.body) {
    console.error("SendGrid error body:", JSON.stringify(err.response.body, null, 2));
  } else {
    console.error("SendGrid error:", err);
  }
}

// routes/auth.js (или където пращаш имейла)
function getAppBaseUrl() {
  const raw = (process.env.APP_BASE_URL || "").trim()

  try {
    // добавяме протокол ако липсва
    const candidate = new URL(raw.startsWith("http") ? raw : `http://${raw}`)
    // отхвърляме очевидно невалидни стойности (празен host или чисто число/порт)
    if (!candidate.hostname || /^\d+$/.test(raw)) throw new Error("bad base")
    // връщаме протокол + host (+ порт при dev)
    return `${candidate.protocol}//${candidate.host}`
  } catch {
    console.warn("Invalid APP_BASE_URL.")
    return "http://localhost:3000"
  }
}

function buildResetLink(rawToken) {
  const base = new URL(getAppBaseUrl())
  base.pathname = "/reset-password"
  base.search = ""
  base.searchParams.set("token", rawToken)
  console.log(base.toString())
  return base.toString()
}

const ACCESS_EXPIRES_IN = "1h";
const REFRESH_EXPIRES_IN = "2h";
const TWO_HOURS_MS = 2 * 60 * 60 * 1000;


// Generate token
// const generateTokens = (user) => {
//   const accessToken = jwt.sign(
//     { id: user.id, email: user.email, role: user.role, name: user.name },
//     process.env.JWT_SECRET,
//     { expiresIn: process.env.JWT_EXPIRES_IN }
//   );

//   const refreshToken = jwt.sign(
//     { id: user.id },
//     process.env.JWT_REFRESH_SECRET,
//     { expiresIn: process.env.JWT_REFRESH_EXPIRES_IN }
//   );

//   return { accessToken, refreshToken };
// };
const generateTokens = (user) => {
  const accessToken = jwt.sign(
    { id: user.id, email: user.email, role: user.role, name: user.name },
    process.env.JWT_SECRET,
    { expiresIn: ACCESS_EXPIRES_IN }
  );

  const refreshToken = jwt.sign(
    { id: user.id },
    process.env.JWT_REFRESH_SECRET,
    { expiresIn: REFRESH_EXPIRES_IN }
  );

  return { accessToken, refreshToken };
};

// POST /auth/register
router.post("/register", registerValidation, async (req, res) => {
  const db = getDb();
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
      return res.status(409).json({ error: "Имейл адресът вече съществува" });
    }
    // Ако има БД тригер за блокирани (shouldn't happen на register), ще падне с код 28000
    if (error && error.code === "28000") {
      return res.status(403).json({ error: "Профилът е блокиран" });
    }
    console.error(error);
    return res.status(500).json({ error: "Registration failed" });
  } finally {
    if (client.release) client.release();
  }
});

// ПОМОЩНА: дали е блокиран към момента
const isBlockedNow = (u) => {
  if (!u) return true;
  if (u.status === "blocked") return true;
  if (u.blocked_until && new Date(u.blocked_until) > new Date()) return true;
  return false;
};

// POST /auth/login
router.post("/login", loginValidation, async (req, res) => {
  const db = getDb();
  const client = db.connect ? await db.connect() : db;

  try {
    const { email, password } = req.body;

    const { rows } = await client.query(
      `SELECT id, email, name, role, password_hash, status, blocked_until
       FROM users
       WHERE email = $1
       LIMIT 1`,
      [email]
    );

    const user = rows[0];
    if (!user || !(await bcrypt.compare(password, user.password_hash))) {
      return res.status(401).json({ error: "Невалидни идентификационни данни" });
    }

    if (isBlockedNow(user)) {
      return res.status(403).json({
        error: "Профилът е блокиран",
        blocked_until: user.blocked_until,
      });
    }

    const tokens = generateTokens(user);

    try {
      await client.query(
        `INSERT INTO refresh_tokens (user_id, token, expires_at)
         VALUES ($1, $2, NOW() + INTERVAL '7 days')`,
        [user.id, tokens.refreshToken]
      );
    } catch (dbErr) {
      // Ако имаш тригер prevent_tokens_for_blocked -> ще даде 28000
      if (dbErr && dbErr.code === "28000") {
        return res.status(403).json({ error: "Профилът е блокиран" });
      }
      throw dbErr;
    }

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

    const { rows: tokenRows } = await client.query(
      `SELECT rt.id, rt.user_id, rt.token, rt.expires_at,
              u.email, u.role, u.status, u.blocked_until, u.name
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

    if (isBlockedNow(tokenRecord)) {
      // Изтриваме този refresh токен за всеки случай
      await client.query(`DELETE FROM refresh_tokens WHERE id = $1`, [tokenRecord.id]);
      return res.status(403).json({
        error: "Профилът е блокиран",
        blocked_until: tokenRecord.blocked_until,
      });
    }

    const user = {
      id: tokenRecord.user_id,
      email: tokenRecord.email,
      role: tokenRecord.role,
      name: tokenRecord.name,
    };
    const tokens = generateTokens(user);

    // Rotate the refresh token
    try {
      await client.query(
        `UPDATE refresh_tokens
         SET token = $1, expires_at = NOW() + INTERVAL '7 days'
         WHERE id = $2`,
        [tokens.refreshToken, tokenRecord.id]
      );
    } catch (dbErr) {
      if (dbErr && dbErr.code === "28000") {
        return res.status(403).json({ error: "Профилът е блокиран" });
      }
      throw dbErr;
    }

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

// POST /auth/forgot-password
router.post("/forgot-password", async (req, res) => {
  // QUICK sanity: if req.body is undefined, you forgot app.use(express.json())
  if (typeof req.body === "undefined") {
    return res.status(500).json({ error: "Body parser not configured (express.json())" });
  }

  const db = getDb();
  const client = db.connect ? await db.connect() : db;

  // generic response to avoid enumeration (used in prod)
  const genericOk = () =>
    res.status(200).json({ message: "Ако този имейл съществува, изпратихме линк за нулиране на паролата." });

  try {
    const email = (req.body?.email || "").trim();
    if (!email) return isDev ? res.status(400).json({ error: "Email required" }) : genericOk();

    // Check env early
    if (!process.env.SENDGRID_API_KEY) {
      console.warn("SENDGRID_API_KEY missing");
      return isDev ? res.status(500).json({ error: "SENDGRID_API_KEY missing" }) : genericOk();
    }
    if (!process.env.SENDGRID_FROM_EMAIL) {
      console.warn("SENDGRID_FROM_EMAIL missing");
      return isDev ? res.status(500).json({ error: "SENDGRID_FROM_EMAIL missing" }) : genericOk();
    }

    // Case-insensitive lookup (important!)
    const { rows } = await client.query(
      `SELECT id, email, name FROM users WHERE lower(email) = lower($1) LIMIT 1`,
      [email]
    );
    const user = rows[0];

    if (!user) {
      // In dev, tell you clearly that the user wasn't found.
      return isDev
        ? res.status(404).json({ error: "User not found for this email" })
        : genericOk();
    }

    const { token, tokenHash } = generateResetToken();
    const expiresAt = new Date(Date.now() + RESET_TOKEN_EXPIRES_MINUTES * 60 * 1000);

    await client.query(
      `INSERT INTO password_reset_tokens (user_id, token_hash, expires_at)
       VALUES ($1, $2, $3)`,
      [user.id, tokenHash, expiresAt]
    );

    const resetLink = buildResetLink(token);

    try {
      await sgMail.send({
        to: user.email,
        from: {
          email: process.env.SENDGRID_FROM_EMAIL,
          name: process.env.SENDGRID_FROM_NAME || "Your App",
        },
        subject: "Reset your password",
        text: `Hi ${user.name || ""},\n\nReset your password:\n${resetLink}\n\nThis link expires in ${RESET_TOKEN_EXPIRES_MINUTES} minutes.`,
        html: `
          <p>Hi ${user.name || ""},</p>
          <p>Click to reset your password:</p>
          <p><a href="${resetLink}" target="_blank" rel="noopener">Reset your password</a></p>
          <p>This link expires in ${RESET_TOKEN_EXPIRES_MINUTES} minutes.</p>
        `,
        mailSettings: { sandboxMode: { enable: false } },
      });
    } catch (err) {
      logSendGridError(err);
      // Surface error in dev so you SEE it in Postman
      return isDev
        ? res.status(500).json({ error: "SendGrid failed", details: err?.response?.body || String(err) })
        : genericOk();
    }

    // In dev, return the resetLink to prove it all works end-to-end.
    if (isDev) {
      console.log("Forgot-password DEV resetLink:", resetLink);
      return res.status(200).json({
        ok: true,
        message: "Имейла е успешно изпратен",
        debug: { resetLink },
      });
    }

    return genericOk();
  } catch (error) {
    console.error(error);
    return isDev
      ? res.status(500).json({ error: "Unexpected error", details: String(error) })
      : genericOk();
  } finally {
    if (client.release) client.release();
  }
});


// GET /auth/reset-password/verify?token=...
router.get("/reset-password/verify", async (req, res) => {
  const db = getDb();
  const client = db.connect ? await db.connect() : db;
  const crypto = require("crypto");

  try {
    const token = String(req.query.token || "");
    if (!token) return res.status(400).json({ valid: false, reason: "missing token" });

    const tokenHash = crypto.createHash("sha256").update(token).digest("hex");
    const { rows } = await client.query(
      `SELECT used_at, expires_at
       FROM password_reset_tokens
       WHERE token_hash = $1
         AND used_at IS NULL
         AND expires_at > NOW()
       LIMIT 1`,
      [tokenHash]
    );

    return res.json({ valid: !!rows[0] });
  } catch (e) {
    console.error(e);
    return res.json({ valid: false });
  } finally {
    if (client.release) client.release();
  }
});


// POST /auth/reset-password
router.post("/reset-password", async (req, res) => {
  const db = getDb();
  const client = db.connect ? await db.connect() : db;

  const isDev = process.env.NODE_ENV !== "production";
  const { token, password } = req.body || {};

  if (!token || typeof token !== "string" || token.length < 40) {
    return res.status(400).json({ error: "Invalid or missing token" });
  }
  if (!password || typeof password !== "string" || password.length < 8) {
    return res.status(400).json({ error: "Password must be at least 8 characters" });
  }

  const crypto = require("crypto");
  const tokenHash = crypto.createHash("sha256").update(token).digest("hex");

  try {
    await client.query("BEGIN");

    // 🔎 Validate directly in DB (not used, not expired)
    const { rows } = await client.query(
      `
      SELECT id, user_id
      FROM password_reset_tokens
      WHERE token_hash = $1
        AND used_at IS NULL
        AND expires_at > NOW()
      LIMIT 1
      `,
      [tokenHash]
    );
    const prt = rows[0];
    if (!prt) {
      await client.query("ROLLBACK");
      return res.status(400).json({ error: "Invalid or expired token" });
    }

    // 🔐 Update password
    const bcrypt = require("bcryptjs");
    const passwordHash = await bcrypt.hash(password, 12);
    await client.query(`UPDATE users SET password_hash = $1 WHERE id = $2`, [passwordHash, prt.user_id]);

    // ✅ Mark this token as used
    await client.query(`UPDATE password_reset_tokens SET used_at = NOW() WHERE id = $1`, [prt.id]);

    // 🧹 (Optional) Clean up other tokens for same user
    await client.query(
      `DELETE FROM password_reset_tokens WHERE user_id = $1 AND used_at IS NULL`,
      [prt.user_id]
    );

    // 🚪 Logout everywhere
    await client.query(`DELETE FROM refresh_tokens WHERE user_id = $1`, [prt.user_id]);

    await client.query("COMMIT");
    return res.json({ message: "Password has been reset successfully" });
  } catch (error) {
    try { await client.query("ROLLBACK"); } catch {}
    if (isDev) {
      console.error("Reset error:", error);
      return res.status(500).json({ error: "Reset failed", details: String(error) });
    }
    return res.status(500).json({ error: "Reset failed" });
  } finally {
    if (client.release) client.release();
  }
});

module.exports = router;
