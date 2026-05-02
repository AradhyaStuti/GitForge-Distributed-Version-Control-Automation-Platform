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
const bookmarkRouter = require("./bookmark.router");
const commentRouter = require("./comment.router");
const analyticsRouter = require("./analytics.router");
const auditLogRouter = require("./auditLog.router");

const { search } = require("../controllers/searchController");
const { searchRules } = require("../middleware/validate");
const { cacheMiddleware } = require("../middleware/cache");

const mainRouter = express.Router();

mainRouter.use("/docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
  customCss: ".swagger-ui .topbar { display: none }",
  customSiteTitle: "Gitless Forge API Docs",
}));

mainRouter.get("/", (req, res) => {
  res.json({
    status: "ok",
    message: "Gitless Forge API is running.",
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

mainRouter.get("/search", cacheMiddleware(30000), searchRules, search);

mainRouter.use(userRouter);
mainRouter.use(repoRouter);
mainRouter.use(issueRouter);
mainRouter.use(prRouter);
mainRouter.use(pipelineRouter);
mainRouter.use(codeReviewRouter);
mainRouter.use(projectBoardRouter);
mainRouter.use(apiKeyRouter);
mainRouter.use(socialRouter);
mainRouter.use(notificationRouter);
mainRouter.use(snippetRouter);
mainRouter.use(bookmarkRouter);
mainRouter.use(commentRouter);
mainRouter.use(analyticsRouter);
mainRouter.use(auditLogRouter);

module.exports = mainRouter;
