const express = require("express");
const analyticsController = require("../controllers/analyticsController");
const authMiddleware = require("../middleware/authMiddleware");

const analyticsRouter = express.Router();

// Static routes before parameterized routes
analyticsRouter.get("/analytics/platform", authMiddleware, analyticsController.getPlatformAnalytics);
analyticsRouter.get("/analytics/trending", authMiddleware, analyticsController.getTrending);

// Parameterized routes
analyticsRouter.get("/analytics/repo/:repoId", authMiddleware, analyticsController.getRepoAnalytics);
analyticsRouter.get("/analytics/user/:userId", authMiddleware, analyticsController.getUserAnalytics);
analyticsRouter.get("/analytics/languages/:repoId", authMiddleware, analyticsController.getLanguageStats);

module.exports = analyticsRouter;
