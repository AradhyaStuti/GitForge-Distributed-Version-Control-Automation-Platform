const express = require("express");
const repoController = require("../controllers/repoController");
const authMiddleware = require("../middleware/authMiddleware");
const { createRepoRules, mongoIdParam, paginationRules } = require("../middleware/validate");

const repoRouter = express.Router();

// Static routes MUST come before parameterized routes
repoRouter.get("/repo/all", paginationRules, repoController.getAllRepositories);
repoRouter.get("/repo/name/:name", paginationRules, repoController.fetchRepositoryByName);
repoRouter.get("/repo/user/:userID", paginationRules, repoController.fetchRepositoriesForCurrentUser);

// Protected
repoRouter.post("/repo/create", authMiddleware, createRepoRules, repoController.createRepository);
repoRouter.put("/repo/update/:id", authMiddleware, mongoIdParam, repoController.updateRepositoryById);
repoRouter.delete("/repo/delete/:id", authMiddleware, mongoIdParam, repoController.deleteRepositoryById);
repoRouter.patch("/repo/toggle/:id", authMiddleware, mongoIdParam, repoController.toggleVisibilityById);

// Activity data for heatmap
repoRouter.get("/repo/activity/:userID", repoController.getActivity);

// Parameterized route last
repoRouter.get("/repo/:id", mongoIdParam, repoController.fetchRepositoryById);

module.exports = repoRouter;
