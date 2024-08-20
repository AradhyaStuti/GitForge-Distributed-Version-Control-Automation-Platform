const express = require("express");
const snippetService = require("../services/snippetService");
const authMiddleware = require("../middleware/authMiddleware");
const { asyncHandler } = require("../middleware/errorHandler");

const r = express.Router();

r.post("/snippet/create", authMiddleware, asyncHandler(async (req, res) => {
  const snippet = await snippetService.create({ ...req.body, author: req.userId });
  res.status(201).json(snippet);
}));

r.get("/snippets", asyncHandler(async (req, res) => {
  const { page, limit, sort } = req.query;
  const result = await snippetService.discover({ page: +page || 1, limit: +limit || 20, sort });
  res.json(result);
}));

r.get("/snippet/user/:userId", asyncHandler(async (req, res) => {
  const result = await snippetService.list({ author: req.params.userId, page: +req.query.page || 1, limit: +req.query.limit || 20 });
  res.json(result);
}));

r.get("/snippet/:id", authMiddleware, asyncHandler(async (req, res) => {
  const snippet = await snippetService.getById(req.params.id, req.userId);
  res.json(snippet);
}));

r.put("/snippet/:id", authMiddleware, asyncHandler(async (req, res) => {
  const snippet = await snippetService.update(req.params.id, req.userId, req.body);
  res.json(snippet);
}));

r.delete("/snippet/:id", authMiddleware, asyncHandler(async (req, res) => {
  const result = await snippetService.delete(req.params.id, req.userId);
  res.json(result);
}));

r.post("/snippet/:id/star", authMiddleware, asyncHandler(async (req, res) => {
  const snippet = await snippetService.star(req.params.id, req.userId);
  res.json(snippet);
}));

r.delete("/snippet/:id/star", authMiddleware, asyncHandler(async (req, res) => {
  const snippet = await snippetService.unstar(req.params.id, req.userId);
  res.json(snippet);
}));

r.post("/snippet/:id/fork", authMiddleware, asyncHandler(async (req, res) => {
  const snippet = await snippetService.fork(req.params.id, req.userId);
  res.status(201).json(snippet);
}));

module.exports = r;
