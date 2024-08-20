const { body, param, query, validationResult } = require("express-validator");

function handleValidation(req, res, next) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      status: "error",
      message: "Validation failed.",
      errors: errors.array().map((e) => ({ field: e.path, message: e.msg })),
    });
  }
  next();
}

const signupRules = [
  body("username")
    .trim()
    .isLength({ min: 3, max: 39 })
    .withMessage("Username must be 3-39 characters.")
    .matches(/^[a-zA-Z0-9_-]+$/)
    .withMessage("Username can only contain letters, numbers, hyphens, and underscores."),
  body("email").isEmail().normalizeEmail().withMessage("Valid email is required."),
  body("password")
    .isLength({ min: 8 })
    .withMessage("Password must be at least 8 characters.")
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage("Password must include uppercase, lowercase, and a number."),
  handleValidation,
];

const loginRules = [
  body("email").isEmail().normalizeEmail().withMessage("Valid email is required."),
  body("password").notEmpty().withMessage("Password is required."),
  handleValidation,
];

const createRepoRules = [
  body("name")
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage("Repository name is required (max 100 chars).")
    .matches(/^[a-zA-Z0-9._-]+$/)
    .withMessage("Repository name can only contain letters, numbers, hyphens, dots, and underscores."),
  body("description")
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage("Description max 500 characters."),
  body("visibility").optional().isBoolean().withMessage("Visibility must be a boolean."),
  handleValidation,
];

const createIssueRules = [
  body("title")
    .trim()
    .isLength({ min: 1, max: 256 })
    .withMessage("Title is required (max 256 chars)."),
  body("description")
    .trim()
    .isLength({ min: 1, max: 65536 })
    .withMessage("Description is required."),
  body("repositoryId").isMongoId().withMessage("Valid repository ID is required."),
  handleValidation,
];

const updateIssueRules = [
  param("id").isMongoId().withMessage("Valid issue ID is required."),
  body("title").optional().trim().isLength({ min: 1, max: 256 }),
  body("description").optional().trim().isLength({ min: 1, max: 65536 }),
  body("status").optional().isIn(["open", "closed"]).withMessage("Status must be 'open' or 'closed'."),
  handleValidation,
];

const mongoIdParam = [
  param("id").isMongoId().withMessage("Valid ID is required."),
  handleValidation,
];

const paginationRules = [
  query("page").optional().isInt({ min: 1 }).toInt().withMessage("Page must be a positive integer."),
  query("limit").optional().isInt({ min: 1, max: 100 }).toInt().withMessage("Limit must be 1-100."),
  handleValidation,
];

const searchRules = [
  query("q")
    .trim()
    .isLength({ min: 1, max: 200 })
    .withMessage("Search query is required (max 200 chars)."),
  query("page").optional().isInt({ min: 1 }).toInt(),
  query("limit").optional().isInt({ min: 1, max: 100 }).toInt(),
  handleValidation,
];

module.exports = {
  signupRules,
  loginRules,
  createRepoRules,
  createIssueRules,
  updateIssueRules,
  mongoIdParam,
  paginationRules,
  searchRules,
  handleValidation,
};
