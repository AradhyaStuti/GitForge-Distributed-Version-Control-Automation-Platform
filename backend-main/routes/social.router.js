const express = require("express");
const socialController = require("../controllers/socialController");
const authMiddleware = require("../middleware/authMiddleware");
const { mongoIdParam } = require("../middleware/validate");

const socialRouter = express.Router();

socialRouter.post("/user/:id/follow", authMiddleware, mongoIdParam, socialController.followUser);
socialRouter.delete("/user/:id/follow", authMiddleware, mongoIdParam, socialController.unfollowUser);
socialRouter.post("/repo/:id/star", authMiddleware, mongoIdParam, socialController.starRepo);
socialRouter.delete("/repo/:id/star", authMiddleware, mongoIdParam, socialController.unstarRepo);
socialRouter.post("/repo/:id/fork", authMiddleware, mongoIdParam, socialController.forkRepo);

module.exports = socialRouter;
