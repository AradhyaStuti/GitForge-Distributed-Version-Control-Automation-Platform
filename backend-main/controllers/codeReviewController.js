const codeReviewService = require("../services/codeReviewService");
const { asyncHandler } = require("../middleware/errorHandler");

const createReview = asyncHandler(async (req, res) => {
  const { pullRequest, repository } = req.body;

  const io = req.app.get("io");
  if (io) io.to(req.userId).emit("codereview:started", { pullRequest, repository });

  const review = await codeReviewService.create({ pullRequest, repository, requestedBy: req.userId });

  if (io) io.to(req.userId).emit("codereview:completed", { review });

  res.status(201).json({ message: "Code review created.", review });
});

const getReviewsByPR = asyncHandler(async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 20;
  const result = await codeReviewService.listByPR(req.params.prId, { page, limit });
  res.json(result);
});

const getReviewById = asyncHandler(async (req, res) => {
  const review = await codeReviewService.getById(req.params.id);
  res.json(review);
});

const acceptSuggestion = asyncHandler(async (req, res) => {
  const review = await codeReviewService.acceptSuggestion(req.params.id, parseInt(req.params.index), req.userId);
  res.json({ message: "Suggestion accepted.", review });
});

const rejectSuggestion = asyncHandler(async (req, res) => {
  const review = await codeReviewService.rejectSuggestion(req.params.id, parseInt(req.params.index), req.userId);
  res.json({ message: "Suggestion rejected.", review });
});

const getReviewStats = asyncHandler(async (req, res) => {
  const stats = await codeReviewService.getStats(req.params.repoId);
  res.json(stats);
});

module.exports = {
  createReview,
  getReviewsByPR,
  getReviewById,
  acceptSuggestion,
  rejectSuggestion,
  getReviewStats,
};
