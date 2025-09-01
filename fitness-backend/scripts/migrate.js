const { Pool } = require("pg")
const fs = require("fs")
const path = require("path")
require("dotenv").config()

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === "production" ? { rejectUnauthorized: false } : false,
})

async function runMigration() {
  try {
    console.log(process.env.DATABASE_URL);
    console.log("Starting database migration...")

    const client = await pool.connect()

    const files = [
      "001_initial_schema.sql",
      "002_trainer_clients.sql",
      "003_workout_system.sql",
      "004_nutrition_system.sql",
      "005_completed_workouts.sql"
    ];

    // Read and execute the SQL file
    //const sqlPath = path.join(__dirname, "001_initial_schema.sql")
    //const sql = fs.readFileSync(sqlPath, "utf8")

    for (const file of files) {
      const sqlPath = path.join(__dirname, file);
      const sql = fs.readFileSync(sqlPath, "utf8");
      console.log(`Applying ${file}...`);
      await client.query(sql);
    }

   // await client.query(sql)

    console.log("Migration completed successfully!")
    client.release()
  } catch (err) {
    console.error("Migration failed:", err)
    process.exit(1)
  } finally {
    await pool.end()
  }
}

runMigration()
