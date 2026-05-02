const express = require("express");
const pipelineController = require("../controllers/pipelineController");
const authMiddleware = require("../middleware/authMiddleware");

const pipelineRouter = express.Router();

pipelineRouter.post("/pipeline", authMiddleware, pipelineController.createPipeline);
pipelineRouter.get("/pipeline", authMiddleware, pipelineController.getPipelines);
pipelineRouter.get("/pipeline/:id", authMiddleware, pipelineController.getPipelineById);
pipelineRouter.post("/pipeline/:id/trigger", authMiddleware, pipelineController.triggerRun);

module.exports = pipelineRouter;
