const express = require("express")
const cors = require("cors")
const helmet = require("helmet")
const rateLimit = require("express-rate-limit")
const path = require("path")
require("dotenv").config()

const { initializeDatabase } = require("./config/database")
const authRoutes = require("./routes/auth")
const userRoutes = require("./routes/users")
const userPersonalRoutes = require("./routes/userPersonal")
const progressRoutes = require("./routes/progress")
const workoutPlanRoutes = require("./routes/workoutPlans")
const workoutPlanSessionRoutes = require("./routes/workoutPlanSessions")
const sessionRoutes = require("./routes/sessions")
const sessionExerciseRoutes = require("./routes/sessionExercises")
const exerciseRoutes = require("./routes/exercises")
const nutritionPlans = require("./routes/nutritionPlans")
const nutritionPlanMeal = require("./routes/nutritionPlanMeals")
const meals = require("./routes/meals")
const completedWorkouts = require("./routes/completedWorkouts")
const { errorHandler } = require("./middleware/errorHandler")

const app = express()
const PORT = process.env.PORT;
const HOST = process.env.HOST;

// Security middleware
app.use(helmet())
app.use(cors())

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000, // limit each IP to 100 requests per windowMs
  message: { error: "Too many requests, please try again later." },
})
app.use(limiter)

// Body parsing middleware
app.use(express.json({ limit: "10mb" }))
app.use(express.urlencoded({ extended: true }))

// Static files for uploads
//app.use("/uploads", express.static(path.join(__dirname, "../uploads")))
app.use("/uploads", (req, res, next) => {
  res.setHeader("Cross-Origin-Resource-Policy", "cross-origin");
  next();
}, express.static(path.join(__dirname, "..", "uploads")));

// Routes
app.use("/auth", authRoutes)
app.use("/users", userRoutes)
app.use("/user-personal", userPersonalRoutes)
app.use("/progress", progressRoutes)
app.use("/workout-plans", workoutPlanRoutes)
app.use("/workout-plan-sessions", workoutPlanSessionRoutes)
app.use("/sessions", sessionRoutes)
app.use("/session-exercises", sessionExerciseRoutes)
app.use("/exercises", exerciseRoutes)
app.use("/nutrition-plans", nutritionPlans)
app.use("/nutrition-plan-meals", nutritionPlanMeal)
app.use("/meals", meals)
app.use("/completed-workout", completedWorkouts)

// Health check
app.get("/health", (req, res) => {
  res.json({ status: "OK", timestamp: new Date().toISOString() })
})

// Error handling
app.use(errorHandler)

// 404 handler
app.use("*", (req, res) => {
  res.status(404).json({ error: "Route not found" })
})

// Initialize database and start server
initializeDatabase()
  .then(() => {
    app.listen(PORT, HOST ?? "localhost" , () => {
      console.log(`Server running on port ${PORT}`)
      console.log(`Environment: ${process.env.NODE_ENV}`)
    })
  })
  .catch((err) => {
    console.error("Failed to initialize database:", err)
    process.exit(1)
  })

module.exports = app
