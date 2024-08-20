const express = require("express");
const issueController = require("../controllers/issueController");
const authMiddleware = require("../middleware/authMiddleware");
const { createIssueRules, updateIssueRules, mongoIdParam, paginationRules } = require("../middleware/validate");

const issueRouter = express.Router();

issueRouter.post("/issue/create", authMiddleware, createIssueRules, issueController.createIssue);
issueRouter.put("/issue/update/:id", authMiddleware, updateIssueRules, issueController.updateIssueById);
issueRouter.delete("/issue/delete/:id", authMiddleware, mongoIdParam, issueController.deleteIssueById);
issueRouter.get("/issue/all", paginationRules, issueController.getAllIssues);
issueRouter.get("/issue/:id", mongoIdParam, issueController.getIssueById);

module.exports = issueRouter;
