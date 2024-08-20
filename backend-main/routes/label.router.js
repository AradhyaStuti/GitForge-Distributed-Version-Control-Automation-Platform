const express = require("express");
const labelController = require("../controllers/labelController");
const authMiddleware = require("../middleware/authMiddleware");

const labelRouter = express.Router();

labelRouter.post("/label/create", authMiddleware, labelController.createLabel);
labelRouter.get("/label/repo/:repoId", labelController.listLabels);
labelRouter.put("/label/:id", authMiddleware, labelController.updateLabel);
labelRouter.delete("/label/:id", authMiddleware, labelController.deleteLabel);
labelRouter.post("/label/init/:repoId", authMiddleware, labelController.initDefaults);

module.exports = labelRouter;
