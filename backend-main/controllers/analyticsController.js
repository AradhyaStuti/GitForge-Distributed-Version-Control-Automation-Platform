const analyticsService = require("../services/analyticsService");
const { asyncHandler } = require("../middleware/errorHandler");

const getRepoAnalytics = asyncHandler(async (req, res) => {
  const analytics = await analyticsService.getRepoAnalytics(req.params.repoId);
  res.json(analytics);
});

const getPlatformAnalytics = asyncHandler(async (req, res) => {
  const analytics = await analyticsService.getPlatformAnalytics();
  res.json(analytics);
});

const getUserAnalytics = asyncHandler(async (req, res) => {
  const analytics = await analyticsService.getUserAnalytics(req.params.userId);
  res.json(analytics);
});

const getTrending = asyncHandler(async (req, res) => {
  const { timeframe } = req.query;
  const trending = await analyticsService.getTrending({ timeframe });
  res.json(trending);
});

const getLanguageStats = asyncHandler(async (req, res) => {
  const stats = await analyticsService.getLanguageStats(req.params.repoId);
  res.json(stats);
});

module.exports = {
  getRepoAnalytics,
  getPlatformAnalytics,
  getUserAnalytics,
  getTrending,
  getLanguageStats,
};
