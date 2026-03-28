const boardService = require("../services/projectBoardService");
const { asyncHandler } = require("../middleware/errorHandler");

const createBoard = asyncHandler(async (req, res) => {
  const board = await boardService.create({ ...req.body, owner: req.userId });

  const io = req.app.get("io");
  if (io) io.to(req.userId).emit("board:updated", { board });

  res.status(201).json({ message: "Board created.", board });
});

const getBoards = asyncHandler(async (req, res) => {
  const { repository, user, page, limit } = req.query;
  const result = await boardService.list({
    repository,
    user,
    page: parseInt(page) || 1,
    limit: parseInt(limit) || 20,
  });
  res.json(result);
});

const getBoardById = asyncHandler(async (req, res) => {
  const board = await boardService.getById(req.params.id);
  res.json(board);
});

const updateBoard = asyncHandler(async (req, res) => {
  const board = await boardService.update(req.params.id, req.userId, req.body);

  const io = req.app.get("io");
  if (io) io.to(req.userId).emit("board:updated", { board });

  res.json({ message: "Board updated.", board });
});

const deleteBoard = asyncHandler(async (req, res) => {
  const result = await boardService.delete(req.params.id, req.userId);
  res.json(result);
});

const addColumn = asyncHandler(async (req, res) => {
  const board = await boardService.addColumn(req.params.id, req.userId, req.body);

  const io = req.app.get("io");
  if (io) io.to(req.userId).emit("board:updated", { board });

  res.status(201).json({ message: "Column added.", board });
});

const updateColumn = asyncHandler(async (req, res) => {
  const board = await boardService.updateColumn(req.params.id, req.params.columnId, req.userId, req.body);

  const io = req.app.get("io");
  if (io) io.to(req.userId).emit("board:updated", { board });

  res.json({ message: "Column updated.", board });
});

const deleteColumn = asyncHandler(async (req, res) => {
  const board = await boardService.deleteColumn(req.params.id, req.params.columnId, req.userId);

  const io = req.app.get("io");
  if (io) io.to(req.userId).emit("board:updated", { board });

  res.json({ message: "Column deleted.", board });
});

const moveColumn = asyncHandler(async (req, res) => {
  const board = await boardService.moveColumn(req.params.id, req.params.columnId, req.userId, req.body);

  const io = req.app.get("io");
  if (io) io.to(req.userId).emit("board:updated", { board });

  res.json({ message: "Column moved.", board });
});

const addCard = asyncHandler(async (req, res) => {
  const board = await boardService.addCard(req.params.id, req.params.columnId, req.userId, req.body);

  const io = req.app.get("io");
  if (io) io.to(req.userId).emit("board:updated", { board });

  res.status(201).json({ message: "Card added.", board });
});

const updateCard = asyncHandler(async (req, res) => {
  const board = await boardService.updateCard(req.params.id, req.params.columnId, req.params.cardId, req.userId, req.body);

  const io = req.app.get("io");
  if (io) io.to(req.userId).emit("board:updated", { board });

  res.json({ message: "Card updated.", board });
});

const deleteCard = asyncHandler(async (req, res) => {
  const board = await boardService.deleteCard(req.params.id, req.params.columnId, req.params.cardId, req.userId);

  const io = req.app.get("io");
  if (io) io.to(req.userId).emit("board:updated", { board });

  res.json({ message: "Card deleted.", board });
});

const moveCard = asyncHandler(async (req, res) => {
  const { fromColumn, toColumn, position } = req.body;
  const board = await boardService.moveCard(req.params.id, req.params.cardId, req.userId, { fromColumn, toColumn, position });

  const io = req.app.get("io");
  if (io) io.to(req.userId).emit("card:moved", { boardId: req.params.id, cardId: req.params.cardId, fromColumn, toColumn, position });

  res.json({ message: "Card moved.", board });
});

module.exports = {
  createBoard,
  getBoards,
  getBoardById,
  updateBoard,
  deleteBoard,
  addColumn,
  updateColumn,
  deleteColumn,
  moveColumn,
  addCard,
  updateCard,
  deleteCard,
  moveCard,
};
