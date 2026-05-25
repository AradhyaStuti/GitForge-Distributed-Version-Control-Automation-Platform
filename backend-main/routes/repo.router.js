const express = require("express");
const repoController = require("../controllers/repoController");
const authMiddleware = require("../middleware/authMiddleware");
const { authenticateAny, requireScope } = require("../middleware/apiKeyAuth");
const { auditAction } = require("../middleware/auditLogger");
const { createRepoRules, mongoIdParam, paginationRules } = require("../middleware/validate");

const repoRouter = express.Router();

repoRouter.get("/repo/all", paginationRules, repoController.getAllRepositories);
// create/update accept either a JWT or an API key so scripts can use the same routes
repoRouter.post(
  "/repo/create",
  authenticateAny,
  requireScope("repo:write"),
  createRepoRules,
  auditAction("repo.create"),
  repoController.createRepository
);
repoRouter.put(
  "/repo/update/:id",
  authenticateAny,
  requireScope("repo:write"),
  mongoIdParam,
  repoController.updateRepositoryById
);
repoRouter.delete(
  "/repo/delete/:id",
  authMiddleware,
  mongoIdParam,
  auditAction("repo.delete", (req) => ({ type: "repo", id: req.params.id })),
  repoController.deleteRepositoryById
);
repoRouter.get("/repo/:id", mongoIdParam, repoController.fetchRepositoryById);

module.exports = repoRouter;
