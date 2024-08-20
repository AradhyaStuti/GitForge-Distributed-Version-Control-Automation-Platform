const express = require("express");
const userController = require("../controllers/userController");
const authMiddleware = require("../middleware/authMiddleware");
const { authLimiter } = require("../middleware/rateLimiter");
const { signupRules, loginRules, mongoIdParam, paginationRules } = require("../middleware/validate");

const userRouter = express.Router();

// Public
userRouter.post("/signup", authLimiter, signupRules, userController.signup);
userRouter.post("/login", authLimiter, loginRules, userController.login);

// Protected
userRouter.get("/allUsers", authMiddleware, paginationRules, userController.getAllUsers);
userRouter.get("/userProfile/:id", mongoIdParam, userController.getUserProfile);
userRouter.put("/updateProfile/:id", authMiddleware, mongoIdParam, userController.updateUserProfile);
userRouter.delete("/deleteProfile/:id", authMiddleware, mongoIdParam, userController.deleteUserProfile);

module.exports = userRouter;
