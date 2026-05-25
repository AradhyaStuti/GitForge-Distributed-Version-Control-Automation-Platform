const express = require("express");
const issueController = require("../controllers/issueController");
const { authenticateAny, requireScope } = require("../middleware/apiKeyAuth");
const { createIssueRules, mongoIdParam, paginationRules } = require("../middleware/validate");

const issueRouter = express.Router();

issueRouter.post(
  "/issue/create",
  authenticateAny,
  requireScope("issue:write"),
  createIssueRules,
  issueController.createIssue
);
issueRouter.get("/issue/all", paginationRules, issueController.getAllIssues);
issueRouter.get("/issue/:id", mongoIdParam, issueController.getIssueById);

module.exports = issueRouter;
