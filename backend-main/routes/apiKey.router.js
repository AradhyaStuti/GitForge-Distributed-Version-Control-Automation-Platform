const express = require("express");
const apiKeyController = require("../controllers/apiKeyController");
const authMiddleware = require("../middleware/authMiddleware");
const { auditAction } = require("../middleware/auditLogger");
const { mongoIdParam } = require("../middleware/validate");
const { apiKeyValidation } = require("../middleware/validateExtended");

const apiKeyRouter = express.Router();

apiKeyRouter.get("/api-keys", authMiddleware, apiKeyController.listKeys);
apiKeyRouter.get("/api-keys/usage", authMiddleware, apiKeyController.getKeyUsage);
apiKeyRouter.post(
  "/api-keys",
  authMiddleware,
  apiKeyValidation,
  auditAction("apikey.create", (req) => ({ type: "user", id: req.userId })),
  apiKeyController.createKey
);
apiKeyRouter.delete(
  "/api-keys/:id",
  authMiddleware,
  mongoIdParam,
  auditAction("apikey.revoke", (req) => ({ type: "apikey", id: req.params.id })),
  apiKeyController.revokeKey
);
apiKeyRouter.post(
  "/api-keys/:id/rotate",
  authMiddleware,
  mongoIdParam,
  auditAction("apikey.rotate", (req) => ({ type: "apikey", id: req.params.id })),
  apiKeyController.rotateKey
);

module.exports = apiKeyRouter;
