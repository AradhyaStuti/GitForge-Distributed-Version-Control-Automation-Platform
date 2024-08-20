const labelService = require("../services/labelService");
const { asyncHandler } = require("../middleware/errorHandler");

const createLabel = asyncHandler(async (req, res) => {
  const label = await labelService.create(req.body);
  res.status(201).json(label);
});

const listLabels = asyncHandler(async (req, res) => {
  const labels = await labelService.list(req.params.repoId);
  res.json(labels);
});

const updateLabel = asyncHandler(async (req, res) => {
  const label = await labelService.update(req.params.id, req.body);
  res.json(label);
});

const deleteLabel = asyncHandler(async (req, res) => {
  const result = await labelService.delete(req.params.id);
  res.json(result);
});

const initDefaults = asyncHandler(async (req, res) => {
  await labelService.initDefaults(req.params.repoId);
  const labels = await labelService.list(req.params.repoId);
  res.json(labels);
});

module.exports = { createLabel, listLabels, updateLabel, deleteLabel, initDefaults };
