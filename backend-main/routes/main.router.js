const express = require("express");
const swaggerUi = require("swagger-ui-express");
const swaggerSpec = require("../config/swagger");
const userRouter = require("./user.router");
const repoRouter = require("./repo.router");
const issueRouter = require("./issue.router");
const socialRouter = require("./social.router");
const notificationRouter = require("./notification.router");
const prRouter = require("./pr.router");
const commentRouter = require("./comment.router");
const labelRouter = require("./label.router");
const snippetRouter = require("./snippet.router");
const bookmarkRouter = require("./bookmark.router");
const milestoneRouter = require("./milestone.router");
const webhookRouter = require("./webhook.router");
const pipelineRouter = require("./pipeline.router");
const codeReviewRouter = require("./codeReview.router");
const projectBoardRouter = require("./projectBoard.router");
const apiKeyRouter = require("./apiKey.router");
const auditLogRouter = require("./auditLog.router");
const analyticsRouter = require("./analytics.router");
const Snippet = require("../models/snippetModel");
const Comment = require("../models/commentModel");
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

// ── Stats (for dashboard) ──────────────────────────────────────────────────
mainRouter.get("/stats", authMiddleware, cacheMiddleware(60000), asyncHandler(async (req, res) => {
  const userId = req.userId;
  const [totalRepos, totalIssues, totalPRs, openIssues, openPRs, totalStars, user] =
    await Promise.all([
      Repository.countDocuments({ owner: userId }),
      Issue.countDocuments({ author: userId }),
      PullRequest.countDocuments({ author: userId }),
      Issue.countDocuments({ author: userId, status: "open" }),
      PullRequest.countDocuments({ author: userId, status: "open" }),
      Repository.aggregate([
        { $match: { owner: require("mongoose").Types.ObjectId.createFromHexString(userId) } },
        { $project: { starCount: { $size: { $ifNull: ["$stars", []] } } } },
        { $group: { _id: null, total: { $sum: "$starCount" } } },
      ]),
      User.findById(userId).select("followedUsers"),
    ]);

  res.json({
    repos: totalRepos,
    issues: totalIssues,
    pullRequests: totalPRs,
    openIssues,
    openPRs,
    stars: totalStars[0]?.total || 0,
    followers: 0,
    following: user?.followedUsers?.length || 0,
  });
}));

// ── Activity Feed ──────────────────────────────────────────────────────────
mainRouter.get("/feed", authMiddleware, asyncHandler(async (req, res) => {
  const userId = req.userId;
  const limit = parseInt(req.query.limit) || 20;

  const [recentRepos, recentIssues, recentPRs] = await Promise.all([
    Repository.find({ owner: userId })
      .sort({ updatedAt: -1 })
      .limit(limit)
      .select("name visibility updatedAt createdAt")
      .lean(),
    Issue.find({ author: userId })
      .sort({ updatedAt: -1 })
      .limit(limit)
      .populate("repository", "name")
      .select("title status repository updatedAt createdAt")
      .lean(),
    PullRequest.find({ author: userId })
      .sort({ updatedAt: -1 })
      .limit(limit)
      .populate("repository", "name")
      .select("title status repository updatedAt createdAt sourceBranch targetBranch")
      .lean(),
  ]);

  // Merge into a unified feed
  const feed = [
    ...recentRepos.map((r) => ({ type: "repo", data: r, date: r.updatedAt })),
    ...recentIssues.map((i) => ({ type: "issue", data: i, date: i.updatedAt })),
    ...recentPRs.map((p) => ({ type: "pr", data: p, date: p.updatedAt })),
  ]
    .sort((a, b) => new Date(b.date) - new Date(a.date))
    .slice(0, limit);

  res.json(feed);
}));

// ── Trending repos ────────────────────────────────────────────────────────
mainRouter.get("/trending", cacheMiddleware(300000), asyncHandler(async (req, res) => {
  const limit = parseInt(req.query.limit) || 10;
  const repos = await Repository.find({ visibility: true })
    .populate("owner", "username")
    .sort({ createdAt: -1 })
    .limit(limit)
    .lean();

  res.json(repos);
}));

// ── Sub-routers ─────────────────────────────────────────────────────────────
mainRouter.use(userRouter);
mainRouter.use(repoRouter);
mainRouter.use(issueRouter);
mainRouter.use(socialRouter);
mainRouter.use(notificationRouter);
mainRouter.use(prRouter);
mainRouter.use(commentRouter);
mainRouter.use(labelRouter);
mainRouter.use(snippetRouter);
mainRouter.use(bookmarkRouter);
mainRouter.use(milestoneRouter);
mainRouter.use(webhookRouter);
mainRouter.use(pipelineRouter);
mainRouter.use(codeReviewRouter);
mainRouter.use(projectBoardRouter);
mainRouter.use(apiKeyRouter);
mainRouter.use(auditLogRouter);
mainRouter.use(analyticsRouter);

// ── Admin analytics ─────────────────────────────────────────────────────
mainRouter.get("/admin/analytics", authMiddleware, cacheMiddleware(120000), asyncHandler(async (req, res) => {
  const [users, repos, issues, prs, snippets, comments] = await Promise.all([
    User.countDocuments(),
    Repository.countDocuments(),
    Issue.countDocuments(),
    PullRequest.countDocuments(),
    Snippet.countDocuments(),
    Comment.countDocuments(),
  ]);

  const recentUsers = await User.find().select("username email createdAt").sort({ createdAt: -1 }).limit(5).lean();
  const recentRepos = await Repository.find().populate("owner", "username").select("name owner createdAt visibility").sort({ createdAt: -1 }).limit(5).lean();

  const now = new Date();
  const weekAgo = new Date(now - 7 * 24 * 60 * 60 * 1000);
  const [newUsersWeek, newReposWeek, newIssuesWeek] = await Promise.all([
    User.countDocuments({ createdAt: { $gte: weekAgo } }),
    Repository.countDocuments({ createdAt: { $gte: weekAgo } }),
    Issue.countDocuments({ createdAt: { $gte: weekAgo } }),
  ]);

  res.json({
    totals: { users, repos, issues, pullRequests: prs, snippets, comments },
    thisWeek: { users: newUsersWeek, repos: newReposWeek, issues: newIssuesWeek },
    recent: { users: recentUsers, repos: recentRepos },
    system: { uptime: process.uptime(), memory: process.memoryUsage(), nodeVersion: process.version },
  });
}));

module.exports = mainRouter;
