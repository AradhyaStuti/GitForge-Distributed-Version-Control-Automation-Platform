const express = require("express");
const boardController = require("../controllers/projectBoardController");
const authMiddleware = require("../middleware/authMiddleware");

const boardRouter = express.Router();

// Board CRUD
boardRouter.post("/boards", authMiddleware, boardController.createBoard);
boardRouter.get("/boards", authMiddleware, boardController.getBoards);
boardRouter.get("/boards/:id", authMiddleware, boardController.getBoardById);
boardRouter.put("/boards/:id", authMiddleware, boardController.updateBoard);
boardRouter.delete("/boards/:id", authMiddleware, boardController.deleteBoard);

// Column management
boardRouter.post("/boards/:id/columns", authMiddleware, boardController.addColumn);
boardRouter.put("/boards/:id/columns/:columnId", authMiddleware, boardController.updateColumn);
boardRouter.delete("/boards/:id/columns/:columnId", authMiddleware, boardController.deleteColumn);
boardRouter.put("/boards/:id/columns/:columnId/move", authMiddleware, boardController.moveColumn);

// Card management
boardRouter.post("/boards/:id/columns/:columnId/cards", authMiddleware, boardController.addCard);
boardRouter.put("/boards/:id/columns/:columnId/cards/:cardId", authMiddleware, boardController.updateCard);
boardRouter.delete("/boards/:id/columns/:columnId/cards/:cardId", authMiddleware, boardController.deleteCard);
boardRouter.put("/boards/:id/cards/:cardId/move", authMiddleware, boardController.moveCard);

module.exports = boardRouter;
