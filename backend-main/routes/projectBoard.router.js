const express = require("express");
const boardController = require("../controllers/projectBoardController");
const authMiddleware = require("../middleware/authMiddleware");

const boardRouter = express.Router();

boardRouter.post("/boards", authMiddleware, boardController.createBoard);
boardRouter.get("/boards", authMiddleware, boardController.getBoards);
boardRouter.get("/boards/:id", authMiddleware, boardController.getBoardById);

module.exports = boardRouter;
