const analyticsService = require("../services/analyticsService");
const { asyncHandler } = require("../middleware/errorHandler");

const getRepoAnalytics = asyncHandler(async (req, res) => {
  const analytics = await analyticsService.getRepositoryAnalytics(req.params.repoId);
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
  const trending = await analyticsService.getTrendingRepos(timeframe);
  res.json(trending);
});

module.exports = {
  getRepoAnalytics,
  getPlatformAnalytics,
  getUserAnalytics,
  getTrending,
};
