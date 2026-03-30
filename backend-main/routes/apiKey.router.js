const express = require("express");
const apiKeyController = require("../controllers/apiKeyController");
const authMiddleware = require("../middleware/authMiddleware");

const apiKeyRouter = express.Router();

apiKeyRouter.post("/api-keys", authMiddleware, apiKeyController.createKey);

module.exports = apiKeyRouter;
