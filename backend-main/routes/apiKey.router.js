const express = require("express");
const apiKeyController = require("../controllers/apiKeyController");
const authMiddleware = require("../middleware/authMiddleware");

const apiKeyRouter = express.Router();

// Static routes before parameterized routes
apiKeyRouter.post("/api-keys", authMiddleware, apiKeyController.createKey);
apiKeyRouter.get("/api-keys", authMiddleware, apiKeyController.listKeys);
apiKeyRouter.get("/api-keys/usage", authMiddleware, apiKeyController.getKeyUsage);

// Parameterized routes
apiKeyRouter.delete("/api-keys/:id", authMiddleware, apiKeyController.revokeKey);
apiKeyRouter.post("/api-keys/:id/rotate", authMiddleware, apiKeyController.rotateKey);

module.exports = apiKeyRouter;
