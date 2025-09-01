const { Pool } = require("pg")

let pool

const initializeDatabase = async () => {
  try {
    // Create connection pool
    pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: process.env.NODE_ENV === "production" ? { rejectUnauthorized: false } : false,
    })

    // Test connection
    const client = await pool.connect()
    console.log("Connected to PostgreSQL database")
    client.release()

    // Create tables
    await createTables()
    console.log("Database initialization completed")
  } catch (err) {
    console.error("Database initialization failed:", err)
    throw err
  }
}

const createTables = async () => {
  const client = await pool.connect()

  try {
    await client.query("BEGIN")

    const queries = [
      // Users table
      `CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        email VARCHAR(255) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        name VARCHAR(255) NOT NULL,
        role VARCHAR(20) CHECK(role IN ('user', 'trainer', 'admin')) DEFAULT 'user',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )`,

      // UserPersonal table
      `CREATE TABLE IF NOT EXISTS user_personal (
        id SERIAL PRIMARY KEY,
        user_id INTEGER UNIQUE NOT NULL,
        sex VARCHAR(10) CHECK(sex IN ('male', 'female')),
        height DECIMAL(5,2),
        goal VARCHAR(10) CHECK(goal IN ('lose', 'gain', 'keep')),
        nutrition_plan_id INTEGER,
        workout_plan_id INTEGER,
        FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
      )`,

      // Progress table
      `CREATE TABLE IF NOT EXISTS progress (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL,
        weight_kg DECIMAL(5,2) NOT NULL,
        body_fat DECIMAL(5,2),
        images JSONB, -- JSON array of image paths
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
      )`,

      // Refresh tokens table
      `CREATE TABLE IF NOT EXISTS refresh_tokens (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL,
        token VARCHAR(255) NOT NULL,
        expires_at TIMESTAMP NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
      )`,

      // Create indexes for better performance
      `CREATE INDEX IF NOT EXISTS idx_users_email ON users(email)`,
      `CREATE INDEX IF NOT EXISTS idx_user_personal_user_id ON user_personal(user_id)`,
      `CREATE INDEX IF NOT EXISTS idx_progress_user_id ON progress(user_id)`,
      `CREATE INDEX IF NOT EXISTS idx_refresh_tokens_user_id ON refresh_tokens(user_id)`,
      `CREATE INDEX IF NOT EXISTS idx_refresh_tokens_token ON refresh_tokens(token)`,
    ]

    for (const query of queries) {
      await client.query(query)
    }

    await client.query("COMMIT")
    console.log("Database tables created successfully")
  } catch (err) {
    await client.query("ROLLBACK")
    throw err
  } finally {
    client.release()
  }
}

const getDb = () => {
  if (!pool) {
    throw new Error("Database not initialized")
  }
  return pool
}

// Helper function for parameterized queries
const query = async (text, params) => {
  const client = await pool.connect()
  try {
    const result = await client.query(text, params)
    return result
  } finally {
    client.release()
  }
}

// Graceful shutdown
const closeDatabase = async () => {
  if (pool) {
    await pool.end()
    console.log("Database connection pool closed")
  }
}

module.exports = {
  initializeDatabase,
  getDb,
  query,
  closeDatabase,
}
