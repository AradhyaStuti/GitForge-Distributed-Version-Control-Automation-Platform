const express = require("express");
const userController = require("../controllers/userController");
const authMiddleware = require("../middleware/authMiddleware");
const { authLimiter } = require("../middleware/rateLimiter");
const { auditAction } = require("../middleware/auditLogger");
const { signupRules, loginRules, mongoIdParam, paginationRules } = require("../middleware/validate");

const userRouter = express.Router();

userRouter.post("/signup", authLimiter, signupRules, auditAction("user.signup"), userController.signup);
userRouter.post("/login", authLimiter, loginRules, auditAction("user.login"), userController.login);

userRouter.get("/userProfile/:id", mongoIdParam, userController.getUserProfile);
userRouter.put("/updateProfile/:id", authMiddleware, mongoIdParam, auditAction("user.update"), userController.updateUserProfile);

module.exports = userRouter;
