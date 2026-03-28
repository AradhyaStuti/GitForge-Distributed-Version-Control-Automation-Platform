const apiKeyService = require("../services/apiKeyService");
const { asyncHandler } = require("../middleware/errorHandler");

const createKey = asyncHandler(async (req, res) => {
  const { name, scopes, expiresIn } = req.body;
  const result = await apiKeyService.create({ name, scopes, expiresIn, userId: req.userId });
  res.status(201).json({ message: "API key created.", ...result });
});

const listKeys = asyncHandler(async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 20;
  const result = await apiKeyService.listByUser(req.userId, { page, limit });
  res.json(result);
});

const revokeKey = asyncHandler(async (req, res) => {
  const result = await apiKeyService.revoke(req.params.id, req.userId);
  res.json(result);
});

const rotateKey = asyncHandler(async (req, res) => {
  const result = await apiKeyService.rotate(req.params.id, req.userId);
  res.json({ message: "API key rotated.", ...result });
});

const getKeyUsage = asyncHandler(async (req, res) => {
  const usage = await apiKeyService.getUsage(req.userId);
  res.json(usage);
});

module.exports = {
  createKey,
  listKeys,
  revokeKey,
  rotateKey,
  getKeyUsage,
};
