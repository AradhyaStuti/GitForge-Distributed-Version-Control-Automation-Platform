const socialService = require("../services/socialService");
const { asyncHandler } = require("../middleware/errorHandler");

const followUser = asyncHandler(async (req, res) => {
  const result = await socialService.followUser(req.userId, req.params.id);
  res.json(result);
});

const unfollowUser = asyncHandler(async (req, res) => {
  const result = await socialService.unfollowUser(req.userId, req.params.id);
  res.json(result);
});

const starRepo = asyncHandler(async (req, res) => {
  const result = await socialService.starRepo(req.userId, req.params.id);
  res.json(result);
});

const unstarRepo = asyncHandler(async (req, res) => {
  const result = await socialService.unstarRepo(req.userId, req.params.id);
  res.json(result);
});

const forkRepo = asyncHandler(async (req, res) => {
  const result = await socialService.forkRepo(req.userId, req.params.id);
  const io = req.app.get("io");
  if (io) io.to(req.userId).emit("repoForked", result);
  res.status(201).json(result);
});

module.exports = { followUser, unfollowUser, starRepo, unstarRepo, forkRepo };
