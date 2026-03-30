const express = require("express");
const codeReviewController = require("../controllers/codeReviewController");
const authMiddleware = require("../middleware/authMiddleware");

const codeReviewRouter = express.Router();

codeReviewRouter.post("/code-review", authMiddleware, codeReviewController.createReview);
codeReviewRouter.get("/code-review/pr/:prId", authMiddleware, codeReviewController.getReviewsByPR);
codeReviewRouter.get("/code-review/:id", authMiddleware, codeReviewController.getReviewById);

module.exports = codeReviewRouter;
