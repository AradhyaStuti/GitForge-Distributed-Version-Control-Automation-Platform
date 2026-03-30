const express = require("express");
const issueController = require("../controllers/issueController");
const authMiddleware = require("../middleware/authMiddleware");
const { createIssueRules, mongoIdParam, paginationRules } = require("../middleware/validate");

const issueRouter = express.Router();

issueRouter.post("/issue/create", authMiddleware, createIssueRules, issueController.createIssue);
issueRouter.get("/issue/all", paginationRules, issueController.getAllIssues);
issueRouter.get("/issue/:id", mongoIdParam, issueController.getIssueById);

module.exports = issueRouter;
