const express = require("express");
const repoController = require("../controllers/repoController");
const authMiddleware = require("../middleware/authMiddleware");
const { createRepoRules, mongoIdParam, paginationRules } = require("../middleware/validate");

const repoRouter = express.Router();

repoRouter.get("/repo/all", paginationRules, repoController.getAllRepositories);
repoRouter.post("/repo/create", authMiddleware, createRepoRules, repoController.createRepository);
repoRouter.put("/repo/update/:id", authMiddleware, mongoIdParam, repoController.updateRepositoryById);
repoRouter.delete("/repo/delete/:id", authMiddleware, mongoIdParam, repoController.deleteRepositoryById);
repoRouter.get("/repo/:id", mongoIdParam, repoController.fetchRepositoryById);

module.exports = repoRouter;
