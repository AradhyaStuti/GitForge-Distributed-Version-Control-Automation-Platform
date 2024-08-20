const issueService = require("../services/issueService");
const { asyncHandler } = require("../middleware/errorHandler");

const createIssue = asyncHandler(async (req, res) => {
  const { title, description, repositoryId } = req.body;
  const { issue, repoName, repoOwnerId } = await issueService.create({
    title,
    description,
    repositoryId,
    authorId: req.userId,
  });

  const io = req.app.get("io");
  if (io) io.to(repoOwnerId).emit("issueCreated", { issue, repoName });

  res.status(201).json(issue);
});

const updateIssueById = asyncHandler(async (req, res) => {
  const issue = await issueService.update(req.params.id, req.body);
  res.json({ message: "Issue updated.", issue });
});

const deleteIssueById = asyncHandler(async (req, res) => {
  const result = await issueService.delete(req.params.id);
  res.json(result);
});

const getAllIssues = asyncHandler(async (req, res) => {
  const { repositoryId, status } = req.query;
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 20;
  const result = await issueService.list({ repositoryId, status, page, limit });
  res.json(result);
});

const getIssueById = asyncHandler(async (req, res) => {
  const issue = await issueService.getById(req.params.id);
  res.json(issue);
});

module.exports = { createIssue, updateIssueById, deleteIssueById, getAllIssues, getIssueById };
