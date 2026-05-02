const express = require("express");
const analyticsController = require("../controllers/analyticsController");
const authMiddleware = require("../middleware/authMiddleware");

const analyticsRouter = express.Router();

// static before parameterized -- otherwise /platform gets caught by :repoId
analyticsRouter.get("/analytics/platform", authMiddleware, analyticsController.getPlatformAnalytics);
analyticsRouter.get("/analytics/trending", authMiddleware, analyticsController.getTrending);

analyticsRouter.get("/analytics/repo/:repoId", authMiddleware, analyticsController.getRepoAnalytics);
analyticsRouter.get("/analytics/user/:userId", authMiddleware, analyticsController.getUserAnalytics);

module.exports = analyticsRouter;
