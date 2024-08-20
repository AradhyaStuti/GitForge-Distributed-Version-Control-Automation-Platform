const express = require("express");
const webhookService = require("../services/webhookService");
const authMiddleware = require("../middleware/authMiddleware");
const { asyncHandler } = require("../middleware/errorHandler");

const r = express.Router();

r.post("/webhook/create", authMiddleware, asyncHandler(async (req, res) => {
  const wh = await webhookService.create({ ...req.body, owner: req.userId });
  res.status(201).json(wh);
}));

r.get("/webhook/repo/:repoId", authMiddleware, asyncHandler(async (req, res) => {
  const webhooks = await webhookService.list(req.params.repoId, req.userId);
  res.json(webhooks);
}));

r.get("/webhook/:id", authMiddleware, asyncHandler(async (req, res) => {
  const wh = await webhookService.getById(req.params.id, req.userId);
  res.json(wh);
}));

r.put("/webhook/:id", authMiddleware, asyncHandler(async (req, res) => {
  const wh = await webhookService.update(req.params.id, req.userId, req.body);
  res.json(wh);
}));

r.delete("/webhook/:id", authMiddleware, asyncHandler(async (req, res) => {
  const result = await webhookService.delete(req.params.id, req.userId);
  res.json(result);
}));

r.get("/webhook/:id/deliveries", authMiddleware, asyncHandler(async (req, res) => {
  const wh = await webhookService.getById(req.params.id, req.userId);
  res.json(wh.deliveries.slice(-20).reverse());
}));

module.exports = r;
