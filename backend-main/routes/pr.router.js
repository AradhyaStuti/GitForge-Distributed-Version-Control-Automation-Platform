const express = require("express");
const prController = require("../controllers/pullRequestController");
const authMiddleware = require("../middleware/authMiddleware");
const { mongoIdParam } = require("../middleware/validate");

const prRouter = express.Router();

prRouter.post("/pr/create", authMiddleware, prController.createPR);
prRouter.get("/pr/all", prController.listPRs);
prRouter.get("/pr/:id", mongoIdParam, prController.getPR);
prRouter.post("/pr/:id/merge", authMiddleware, mongoIdParam, prController.mergePR);

module.exports = prRouter;
