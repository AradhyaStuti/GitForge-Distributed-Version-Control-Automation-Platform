const express = require("express");
const commentController = require("../controllers/commentController");
const authMiddleware = require("../middleware/authMiddleware");
const { mongoIdParam } = require("../middleware/validate");

const commentRouter = express.Router();

commentRouter.post("/comment/create", authMiddleware, commentController.createComment);
commentRouter.get("/comment/issue/:issueId", commentController.getIssueComments);
commentRouter.get("/comment/pr/:prId", commentController.getPRComments);
commentRouter.put("/comment/:id", authMiddleware, mongoIdParam, commentController.updateComment);
commentRouter.delete("/comment/:id", authMiddleware, mongoIdParam, commentController.deleteComment);
commentRouter.post(
  "/comment/:id/react/:reaction",
  authMiddleware,
  commentController.toggleReaction
);

module.exports = commentRouter;
