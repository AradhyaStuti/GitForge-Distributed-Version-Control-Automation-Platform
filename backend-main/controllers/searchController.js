const searchService = require("../services/searchService");
const { asyncHandler } = require("../middleware/errorHandler");

const search = asyncHandler(async (req, res) => {
  const { q, type } = req.query;
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 20;

  const results = await searchService.search({ query: q, type, page, limit });
  res.json({ query: q, page, limit, results });
});

module.exports = { search };
