const userService = require("../services/userService");
const { asyncHandler } = require("../middleware/errorHandler");

const signup = asyncHandler(async (req, res) => {
  const result = await userService.createUser(req.body);
  res.status(201).json(result);
});

const login = asyncHandler(async (req, res) => {
  const result = await userService.authenticateUser(req.body);
  res.json(result);
});

const getAllUsers = asyncHandler(async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 20;
  const result = await userService.listUsers({ page, limit });
  res.json(result);
});

const getUserProfile = asyncHandler(async (req, res) => {
  const user = await userService.getUserById(req.params.id);
  res.json(user);
});

const updateUserProfile = asyncHandler(async (req, res) => {
  const user = await userService.updateUser(req.params.id, req.body);
  res.json(user);
});

const deleteUserProfile = asyncHandler(async (req, res) => {
  const result = await userService.deleteUser(req.params.id);
  res.json(result);
});

module.exports = { signup, login, getAllUsers, getUserProfile, updateUserProfile, deleteUserProfile };
