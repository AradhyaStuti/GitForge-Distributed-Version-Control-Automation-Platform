const repoService = require("../services/repoService");
const { asyncHandler } = require("../middleware/errorHandler");

const createRepository = asyncHandler(async (req, res) => {
  const { name, description, visibility } = req.body;
  const repo = await repoService.create({ name, description, visibility, ownerId: req.userId });

  const io = req.app.get("io");
  if (io) io.to(req.userId).emit("repoCreated", { repository: repo });

  res.status(201).json({ message: "Repository created!", repository: repo });
});

const getAllRepositories = asyncHandler(async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 20;
  const result = await repoService.listPublic({ page, limit });
  res.json(result);
});

const fetchRepositoryById = asyncHandler(async (req, res) => {
  const repo = await repoService.getById(req.params.id);
  res.json(repo);
});

const fetchRepositoryByName = asyncHandler(async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 20;
  const result = await repoService.searchByName(req.params.name, { page, limit });
  res.json(result);
});

const fetchRepositoriesForCurrentUser = asyncHandler(async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 20;
  const result = await repoService.listByUser(req.params.userID, { page, limit });
  res.json(result);
});

const updateRepositoryById = asyncHandler(async (req, res) => {
  const repo = await repoService.update(req.params.id, req.userId, req.body);
  res.json({ message: "Repository updated.", repository: repo });
});

const toggleVisibilityById = asyncHandler(async (req, res) => {
  const repo = await repoService.toggleVisibility(req.params.id, req.userId);
  res.json({ message: "Visibility toggled.", repository: repo });
});

const deleteRepositoryById = asyncHandler(async (req, res) => {
  const result = await repoService.delete(req.params.id, req.userId);
  res.json(result);
});

const getActivity = asyncHandler(async (req, res) => {
  const activity = await repoService.getActivityForUser(req.params.userID);
  res.json(activity);
});

module.exports = {
  createRepository,
  getAllRepositories,
  fetchRepositoryById,
  fetchRepositoryByName,
  fetchRepositoriesForCurrentUser,
  updateRepositoryById,
  toggleVisibilityById,
  deleteRepositoryById,
  getActivity,
};
