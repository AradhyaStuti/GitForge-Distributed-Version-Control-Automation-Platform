const prService = require("../services/pullRequestService");
const { asyncHandler } = require("../middleware/errorHandler");

const createPR = asyncHandler(async (req, res) => {
  const pr = await prService.create({ ...req.body, author: req.userId });
  const io = req.app.get("io");
  if (io) io.to(pr.repository?.owner?.toString()).emit("prCreated", pr);
  res.status(201).json(pr);
});

const listPRs = asyncHandler(async (req, res) => {
  const { repositoryId, status, author, page, limit } = req.query;
  const result = await prService.list({
    repositoryId,
    status,
    author,
    page: parseInt(page) || 1,
    limit: parseInt(limit) || 20,
  });
  res.json(result);
});

const getPR = asyncHandler(async (req, res) => {
  const pr = await prService.getById(req.params.id);
  res.json(pr);
});

const updatePR = asyncHandler(async (req, res) => {
  const pr = await prService.update(req.params.id, req.userId, req.body);
  res.json(pr);
});

const mergePR = asyncHandler(async (req, res) => {
  const pr = await prService.merge(req.params.id, req.userId);
  const io = req.app.get("io");
  if (io) {
    io.to(pr.author?.toString()).emit("prMerged", pr);
  }
  res.json(pr);
});

const addReview = asyncHandler(async (req, res) => {
  const pr = await prService.addReview(req.params.id, req.userId, req.body);
  res.json(pr);
});

const countPRs = asyncHandler(async (req, res) => {
  const counts = await prService.countByRepo(req.params.repoId);
  res.json(counts);
});

module.exports = { createPR, listPRs, getPR, updatePR, mergePR, addReview, countPRs };
