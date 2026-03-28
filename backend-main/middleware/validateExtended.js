const { body, param, query } = require("express-validator");
const { handleValidation } = require("./validate");

const VALID_SCOPES = [
  "repo:read",
  "repo:write",
  "issue:read",
  "issue:write",
  "pr:read",
  "pr:write",
  "user:read",
  "webhook:manage",
  "admin",
  "pipeline:read",
  "pipeline:write",
];

const pipelineValidation = [
  body("name")
    .trim()
    .notEmpty()
    .withMessage("Pipeline name is required.")
    .isLength({ max: 100 })
    .withMessage("Pipeline name max 100 characters."),
  body("config")
    .notEmpty()
    .withMessage("Pipeline config is required."),
  body("config.stages")
    .isArray({ min: 1 })
    .withMessage("Pipeline config must include at least one stage."),
  body("config.stages.*.name")
    .trim()
    .notEmpty()
    .withMessage("Each stage must have a name."),
  handleValidation,
];

const boardValidation = [
  body("name")
    .trim()
    .notEmpty()
    .withMessage("Board name is required.")
    .isLength({ max: 100 })
    .withMessage("Board name max 100 characters."),
  body("description")
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage("Description max 500 characters."),
  handleValidation,
];

const columnValidation = [
  body("name")
    .trim()
    .notEmpty()
    .withMessage("Column name is required.")
    .isLength({ max: 50 })
    .withMessage("Column name max 50 characters."),
  body("color")
    .optional()
    .matches(/^#[0-9a-fA-F]{6}$/)
    .withMessage("Color must be a valid hex color (e.g. #7c3aed)."),
  handleValidation,
];

const cardValidation = [
  body("title")
    .trim()
    .notEmpty()
    .withMessage("Card title is required.")
    .isLength({ max: 256 })
    .withMessage("Card title max 256 characters."),
  body("type")
    .optional()
    .isIn(["issue", "task", "note"])
    .withMessage("Card type must be 'issue', 'task', or 'note'."),
  body("priority")
    .optional()
    .isIn(["critical", "high", "medium", "low", "none"])
    .withMessage("Priority must be 'critical', 'high', 'medium', 'low', or 'none'."),
  handleValidation,
];

const apiKeyValidation = [
  body("name")
    .trim()
    .isLength({ min: 3, max: 100 })
    .withMessage("API key name must be 3-100 characters."),
  body("scopes")
    .isArray({ min: 1 })
    .withMessage("At least one scope is required.")
    .custom((scopes) => {
      const invalid = scopes.filter((s) => !VALID_SCOPES.includes(s));
      if (invalid.length > 0) {
        throw new Error(`Invalid scope(s): ${invalid.join(", ")}`);
      }
      return true;
    }),
  handleValidation,
];

const reviewValidation = [
  body("pullRequest")
    .isMongoId()
    .withMessage("Valid pull request ID is required."),
  body("repository")
    .isMongoId()
    .withMessage("Valid repository ID is required."),
  handleValidation,
];

const analyticsValidation = [
  query("timeframe")
    .optional()
    .isIn(["day", "week", "month", "year"])
    .withMessage("Timeframe must be 'day', 'week', 'month', or 'year'."),
  handleValidation,
];

module.exports = {
  pipelineValidation,
  boardValidation,
  columnValidation,
  cardValidation,
  apiKeyValidation,
  reviewValidation,
  analyticsValidation,
};
