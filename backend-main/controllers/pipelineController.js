const pipelineService = require("../services/pipelineService");
const { asyncHandler } = require("../middleware/errorHandler");

const createPipeline = asyncHandler(async (req, res) => {
  const { name, repository, config } = req.body;
  const pipeline = await pipelineService.create({ name, repository, config, createdBy: req.userId });

  const io = req.app.get("io");
  if (io) io.to(req.userId).emit("pipeline:created", { pipeline });

  res.status(201).json({ message: "Pipeline created.", pipeline });
});

const getPipelines = asyncHandler(async (req, res) => {
  const { repository, page, limit } = req.query;
  const result = await pipelineService.list({
    repository,
    page: parseInt(page) || 1,
    limit: parseInt(limit) || 20,
  });
  res.json(result);
});

const getPipelineById = asyncHandler(async (req, res) => {
  const pipeline = await pipelineService.getById(req.params.id);
  res.json(pipeline);
});

const updatePipeline = asyncHandler(async (req, res) => {
  const pipeline = await pipelineService.update(req.params.id, req.userId, req.body);
  res.json({ message: "Pipeline updated.", pipeline });
});

const deletePipeline = asyncHandler(async (req, res) => {
  const result = await pipelineService.delete(req.params.id, req.userId);
  res.json(result);
});

const triggerRun = asyncHandler(async (req, res) => {
  const { branch, commitSha } = req.body;
  const run = await pipelineService.triggerRun(req.params.id, req.userId, { branch, commitSha });

  const io = req.app.get("io");
  if (io) {
    io.to(req.userId).emit("pipeline:triggered", { pipelineId: req.params.id, run });
  }

  res.status(201).json({ message: "Pipeline run triggered.", run });
});

const cancelRun = asyncHandler(async (req, res) => {
  const run = await pipelineService.cancelRun(req.params.id, req.params.runNumber, req.userId);

  const io = req.app.get("io");
  if (io) {
    io.to(req.userId).emit("pipeline:failed", { pipelineId: req.params.id, run });
  }

  res.json({ message: "Pipeline run cancelled.", run });
});

const getRunLogs = asyncHandler(async (req, res) => {
  const logs = await pipelineService.getRunLogs(req.params.id, req.params.runNumber);
  res.json(logs);
});

const getPipelineStats = asyncHandler(async (req, res) => {
  const stats = await pipelineService.getStats(req.params.repoId);
  res.json(stats);
});

const getPipelineBadge = asyncHandler(async (req, res) => {
  const svg = await pipelineService.getBadge(req.params.id);
  res.setHeader("Content-Type", "image/svg+xml");
  res.setHeader("Cache-Control", "no-cache");
  res.send(svg);
});

module.exports = {
  createPipeline,
  getPipelines,
  getPipelineById,
  updatePipeline,
  deletePipeline,
  triggerRun,
  cancelRun,
  getRunLogs,
  getPipelineStats,
  getPipelineBadge,
};
