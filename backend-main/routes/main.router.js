const express = require("express");
const swaggerUi = require("swagger-ui-express");
const swaggerSpec = require("../config/swagger");
const userRouter = require("./user.router");
const repoRouter = require("./repo.router");
const issueRouter = require("./issue.router");
const socialRouter = require("./social.router");
const notificationRouter = require("./notification.router");
const prRouter = require("./pr.router");
const snippetRouter = require("./snippet.router");
const pipelineRouter = require("./pipeline.router");
const codeReviewRouter = require("./codeReview.router");
const projectBoardRouter = require("./projectBoard.router");
const apiKeyRouter = require("./apiKey.router");
const Snippet = require("../models/snippetModel");
const { search } = require("../controllers/searchController");
const { searchRules } = require("../middleware/validate");
const { cacheMiddleware } = require("../middleware/cache");
const authMiddleware = require("../middleware/authMiddleware");
const User = require("../models/userModel");
const Repository = require("../models/repoModel");
const Issue = require("../models/issueModel");
const PullRequest = require("../models/pullRequestModel");
const { asyncHandler } = require("../middleware/errorHandler");

const mainRouter = express.Router();

// ── API Docs ────────────────────────────────────────────────────────────────
mainRouter.use("/docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
  customCss: ".swagger-ui .topbar { display: none }",
  customSiteTitle: "GitForge API Docs",
}));

// ── Health ──────────────────────────────────────────────────────────────────
mainRouter.get("/", (req, res) => {
  res.json({
    status: "ok",
    message: "GitForge API is running.",
    version: "1.0.0",
    docs: "/api/v1/docs",
  });
});

mainRouter.get("/health", (req, res) => {
  res.json({
    status: "ok",
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
    memory: process.memoryUsage(),
  });
});

// ── Search (cached) ─────────────────────────────────────────────────────────
mainRouter.get("/search", cacheMiddleware(30000), searchRules, search);


// ── Sub-routers ─────────────────────────────────────────────────────────────
mainRouter.use(userRouter);
mainRouter.use(repoRouter);
mainRouter.use(issueRouter);
mainRouter.use(prRouter);
mainRouter.use(pipelineRouter);
mainRouter.use(codeReviewRouter);
mainRouter.use(projectBoardRouter);
mainRouter.use(apiKeyRouter);


module.exports = mainRouter;
