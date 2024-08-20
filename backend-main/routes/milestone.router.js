const express = require("express");
const milestoneService = require("../services/milestoneService");
const authMiddleware = require("../middleware/authMiddleware");
const { asyncHandler } = require("../middleware/errorHandler");

const r = express.Router();

r.post("/milestone/create", authMiddleware, asyncHandler(async (req, res) => {
  const m = await milestoneService.create({ ...req.body, creator: req.userId });
  res.status(201).json(m);
}));

r.get("/milestone/repo/:repoId", asyncHandler(async (req, res) => {
  const milestones = await milestoneService.list(req.params.repoId);
  res.json(milestones);
}));

r.put("/milestone/:id", authMiddleware, asyncHandler(async (req, res) => {
  const m = await milestoneService.update(req.params.id, req.userId, req.body);
  res.json(m);
}));

r.delete("/milestone/:id", authMiddleware, asyncHandler(async (req, res) => {
  const result = await milestoneService.delete(req.params.id);
  res.json(result);
}));

module.exports = r;
