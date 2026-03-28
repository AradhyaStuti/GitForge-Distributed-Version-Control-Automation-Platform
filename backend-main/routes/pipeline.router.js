const express = require("express");
const pipelineController = require("../controllers/pipelineController");
const authMiddleware = require("../middleware/authMiddleware");

const pipelineRouter = express.Router();

// Static routes before parameterized routes
pipelineRouter.post("/pipeline", authMiddleware, pipelineController.createPipeline);
pipelineRouter.get("/pipeline", authMiddleware, pipelineController.getPipelines);
pipelineRouter.get("/pipeline/stats/:repoId", authMiddleware, pipelineController.getPipelineStats);

// Parameterized routes
pipelineRouter.get("/pipeline/:id", authMiddleware, pipelineController.getPipelineById);
pipelineRouter.put("/pipeline/:id", authMiddleware, pipelineController.updatePipeline);
pipelineRouter.delete("/pipeline/:id", authMiddleware, pipelineController.deletePipeline);
pipelineRouter.post("/pipeline/:id/trigger", authMiddleware, pipelineController.triggerRun);
pipelineRouter.post("/pipeline/:id/runs/:runNumber/cancel", authMiddleware, pipelineController.cancelRun);
pipelineRouter.get("/pipeline/:id/runs/:runNumber/logs", authMiddleware, pipelineController.getRunLogs);
pipelineRouter.get("/pipeline/:id/badge", pipelineController.getPipelineBadge);

module.exports = pipelineRouter;
