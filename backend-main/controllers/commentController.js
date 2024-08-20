const commentService = require("../services/commentService");
const { asyncHandler } = require("../middleware/errorHandler");

const createComment = asyncHandler(async (req, res) => {
  const comment = await commentService.create({ ...req.body, author: req.userId });
  res.status(201).json(comment);
});

const getIssueComments = asyncHandler(async (req, res) => {
  const result = await commentService.listByIssue(req.params.issueId, {
    page: parseInt(req.query.page) || 1,
    limit: parseInt(req.query.limit) || 50,
  });
  res.json(result);
});

const getPRComments = asyncHandler(async (req, res) => {
  const result = await commentService.listByPR(req.params.prId, {
    page: parseInt(req.query.page) || 1,
    limit: parseInt(req.query.limit) || 50,
  });
  res.json(result);
});

const updateComment = asyncHandler(async (req, res) => {
  const comment = await commentService.update(req.params.id, req.userId, req.body.body);
  res.json(comment);
});

const deleteComment = asyncHandler(async (req, res) => {
  const result = await commentService.delete(req.params.id, req.userId);
  res.json(result);
});

const toggleReaction = asyncHandler(async (req, res) => {
  const comment = await commentService.toggleReaction(
    req.params.id,
    req.userId,
    req.params.reaction
  );
  res.json(comment);
});

module.exports = {
  createComment,
  getIssueComments,
  getPRComments,
  updateComment,
  deleteComment,
  toggleReaction,
};
