const express = require("express");
const prController = require("../controllers/pullRequestController");
const authMiddleware = require("../middleware/authMiddleware");
const { mongoIdParam } = require("../middleware/validate");

const prRouter = express.Router();

prRouter.post("/pr/create", authMiddleware, prController.createPR);
prRouter.get("/pr/all", prController.listPRs);
prRouter.get("/pr/:id", mongoIdParam, prController.getPR);
prRouter.put("/pr/update/:id", authMiddleware, mongoIdParam, prController.updatePR);
prRouter.post("/pr/:id/merge", authMiddleware, mongoIdParam, prController.mergePR);
prRouter.post("/pr/:id/review", authMiddleware, mongoIdParam, prController.addReview);
prRouter.get("/pr/count/:repoId", prController.countPRs);

module.exports = prRouter;
