const express = require("express");
const bookmarkService = require("../services/bookmarkService");
const authMiddleware = require("../middleware/authMiddleware");
const { asyncHandler } = require("../middleware/errorHandler");

const r = express.Router();

r.post("/bookmark", authMiddleware, asyncHandler(async (req, res) => {
  const bm = await bookmarkService.add({ user: req.userId, ...req.body });
  res.status(201).json(bm);
}));

r.delete("/bookmark/:id", authMiddleware, asyncHandler(async (req, res) => {
  const result = await bookmarkService.remove(req.userId, req.params.id);
  res.json(result);
}));

r.get("/bookmarks", authMiddleware, asyncHandler(async (req, res) => {
  const bookmarks = await bookmarkService.list(req.userId);
  res.json(bookmarks);
}));

r.get("/bookmark/check", authMiddleware, asyncHandler(async (req, res) => {
  const { repository, snippet } = req.query;
  const bookmarked = await bookmarkService.isBookmarked(req.userId, { repository, snippet });
  res.json({ bookmarked });
}));

module.exports = r;
