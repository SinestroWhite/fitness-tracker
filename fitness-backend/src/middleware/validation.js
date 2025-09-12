const { body, query, param, validationResult } = require("express-validator")

const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req)
  if (!errors.isEmpty()) {
    return res.status(400).json({
      error: "Validation failed",
      details: errors.array(),
    })
  }
  next()
}

// Auth validation rules
const registerValidation = [
  body("email").isEmail().normalizeEmail(),
  body("password").isLength({ min: 6 }).withMessage("Password must be at least 6 characters"),
  body("name").trim().isLength({ min: 1 }).withMessage("Name is required"),
  handleValidationErrors,
]

const loginValidation = [
  body("email").isEmail().normalizeEmail(),
  body("password").notEmpty().withMessage("Password is required"),
  handleValidationErrors,
]

// User validation rules
const updateUserValidation = [
  body("name").optional().trim().isLength({ min: 1 }),
  body("email").optional().isEmail().normalizeEmail(),
  body("role").optional().isIn(["user", "trainer", "admin"]),
  handleValidationErrors,
]

// UserPersonal validation rules
const userPersonalValidation = [
  body("sex").optional().isIn(["male", "female"]),
  body("height").optional().isFloat({ min: 0, max: 300 }),
  body("goal").optional().isIn(["lose", "gain", "keep"]),
  body("nutritionPlanId").optional({ nullable: true }).isInt({ min: 1 }),
  body("workoutPlanId").optional({ nullable: true }).isInt({ min: 1 }),
  handleValidationErrors,
]

// Progress validation rules
const progressValidation = [
  body("weightKg").isFloat({ min: 0, max: 1000 }).withMessage("Weight must be a valid number"),
  body("bodyFat").optional().isFloat({ min: 0, max: 100 }),
  handleValidationErrors,
]

const validateWorkoutPlan = [
  body("title").trim().isLength({ min: 1 }).withMessage("Title is required"),
  body("goal").isIn(["lose", "gain", "maintain"]).withMessage("Goal must be lose, gain, or maintain"),
  handleValidationErrors,
]

// Session validation rules
const validateSession = [
  body("title").trim().isLength({ min: 1 }).withMessage("Title is required"),
  body("bodyArea").isIn(["full_body", "upper_body", "lower_body", "core"]).withMessage("Invalid body area"),
  body("durationMins").isInt({ min: 1, max: 300 }).withMessage("Duration must be between 1 and 300 minutes"),
  body("description").optional().trim(),
  handleValidationErrors,
]

// Exercise validation rules
const validateExercise = [
  body("name").trim().isLength({ min: 1 }).withMessage("Name is required"),
  body("muscle")
    .isIn(["chest", "back", "legs", "shoulders", "arms", "core", "full_body"])
    .withMessage("Invalid muscle group"),
  body("image").optional().isURL().withMessage("Image must be a valid URL"),
  body("video").optional().isURL().withMessage("Video must be a valid URL"),
  handleValidationErrors,
]

// Pagination validation
const paginationValidation = [
  query("page").optional().isInt({ min: 1 }).toInt(),
  query("pageSize").optional().isInt({ min: 1, max: 100 }).toInt(),
  handleValidationErrors,
]

module.exports = {
  registerValidation,
  loginValidation,
  updateUserValidation,
  userPersonalValidation,
  progressValidation,
  validateWorkoutPlan,
  validateSession,
  validateExercise,
  paginationValidation,
  handleValidationErrors,
}
