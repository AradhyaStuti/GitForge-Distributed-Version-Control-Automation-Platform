const express = require("express");
const codeReviewController = require("../controllers/codeReviewController");
const authMiddleware = require("../middleware/authMiddleware");

const codeReviewRouter = express.Router();

// Static routes before parameterized routes
codeReviewRouter.post("/code-review", authMiddleware, codeReviewController.createReview);
codeReviewRouter.get("/code-review/pr/:prId", authMiddleware, codeReviewController.getReviewsByPR);
codeReviewRouter.get("/code-review/stats/:repoId", authMiddleware, codeReviewController.getReviewStats);

// Parameterized routes
codeReviewRouter.get("/code-review/:id", authMiddleware, codeReviewController.getReviewById);
codeReviewRouter.put("/code-review/:id/suggestions/:index/accept", authMiddleware, codeReviewController.acceptSuggestion);
codeReviewRouter.put("/code-review/:id/suggestions/:index/reject", authMiddleware, codeReviewController.rejectSuggestion);

module.exports = codeReviewRouter;
