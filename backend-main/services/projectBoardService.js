'use strict';

const crypto = require("crypto");
const ProjectBoard = require("../models/ProjectBoard");
const { AppError } = require("../middleware/errorHandler");

class ProjectBoardService {
  async createBoard(data) {
    const board = await ProjectBoard.create({
      name: data.name,
      description: data.description || "",
      repository: data.repository || null,
      owner: data.owner,
      visibility: data.visibility || "private",
      members: data.members || [],
    });

    return board;
  }

  async getBoardsByRepo(repoId) {
    return ProjectBoard.find({ repository: repoId, archived: false })
      .populate("owner", "username email")
      .sort({ createdAt: -1 });
  }

  async getBoardsByUser(userId) {
    return ProjectBoard.find({
      $or: [{ owner: userId }, { "members.user": userId }],
      archived: false,
    })
      .populate("owner", "username email")
      .sort({ updatedAt: -1 });
  }

  async getBoardById(id) {
    const board = await ProjectBoard.findById(id)
      .populate("owner", "username email")
      .populate("members.user", "username email")
      .populate("columns.cards.assignees", "username email")
      .populate("columns.cards.createdBy", "username email");

    if (!board) throw new AppError("Project board not found.", 404);
    return board;
  }

  async updateBoard(id, data) {
    const board = await ProjectBoard.findById(id);
    if (!board) throw new AppError("Project board not found.", 404);

    const allowed = ["name", "description", "visibility", "settings", "archived"];
    for (const key of Object.keys(data)) {
      if (allowed.includes(key)) board[key] = data[key];
    }

    await board.save();
    return board;
  }

  async deleteBoard(id) {
    const board = await ProjectBoard.findByIdAndDelete(id);
    if (!board) throw new AppError("Project board not found.", 404);
    return { message: "Project board deleted." };
  }

  async addColumn(boardId, columnData) {
    const board = await ProjectBoard.findById(boardId);
    if (!board) throw new AppError("Project board not found.", 404);

    const position = columnData.position ?? board.columns.length;
    board.columns.push({
      id: crypto.randomUUID(),
      name: columnData.name,
      position,
      color: columnData.color || "#7c3aed",
      wipLimit: columnData.wipLimit || 0,
      cards: [],
    });

    await board.save();
    return board;
  }

  async updateColumn(boardId, columnId, data) {
    const board = await ProjectBoard.findById(boardId);
    if (!board) throw new AppError("Project board not found.", 404);

    const column = board.columns.find((c) => c.id === columnId);
    if (!column) throw new AppError("Column not found.", 404);

    const allowed = ["name", "color", "wipLimit"];
    for (const key of Object.keys(data)) {
      if (allowed.includes(key)) column[key] = data[key];
    }

    await board.save();
    return board;
  }

  async deleteColumn(boardId, columnId) {
    const board = await ProjectBoard.findById(boardId);
    if (!board) throw new AppError("Project board not found.", 404);

    const idx = board.columns.findIndex((c) => c.id === columnId);
    if (idx === -1) throw new AppError("Column not found.", 404);

    board.columns.splice(idx, 1);
    // Reorder positions
    board.columns.forEach((col, i) => { col.position = i; });

    await board.save();
    return board;
  }

  async moveColumn(boardId, columnId, newPosition) {
    const board = await ProjectBoard.findById(boardId);
    if (!board) throw new AppError("Project board not found.", 404);

    const idx = board.columns.findIndex((c) => c.id === columnId);
    if (idx === -1) throw new AppError("Column not found.", 404);

    const [column] = board.columns.splice(idx, 1);
    board.columns.splice(newPosition, 0, column);
    board.columns.forEach((col, i) => { col.position = i; });

    await board.save();
    return board;
  }

  async addCard(boardId, columnId, cardData) {
    const board = await ProjectBoard.findById(boardId);
    if (!board) throw new AppError("Project board not found.", 404);

    const column = board.columns.find((c) => c.id === columnId);
    if (!column) throw new AppError("Column not found.", 404);

    if (column.wipLimit > 0 && column.cards.length >= column.wipLimit) {
      throw new AppError(`Column "${column.name}" has reached its WIP limit of ${column.wipLimit}.`, 400);
    }

    const position = cardData.position ?? column.cards.length;
    column.cards.push({
      id: crypto.randomUUID(),
      type: cardData.type || "task",
      title: cardData.title,
      description: cardData.description || "",
      issue: cardData.issue || null,
      assignees: cardData.assignees || [],
      labels: cardData.labels || [],
      priority: cardData.priority || "none",
      dueDate: cardData.dueDate || null,
      position,
      createdBy: cardData.createdBy,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    await board.save();
    return board;
  }

  async updateCard(boardId, columnId, cardId, data) {
    const board = await ProjectBoard.findById(boardId);
    if (!board) throw new AppError("Project board not found.", 404);

    const column = board.columns.find((c) => c.id === columnId);
    if (!column) throw new AppError("Column not found.", 404);

    const card = column.cards.find((c) => c.id === cardId);
    if (!card) throw new AppError("Card not found.", 404);

    const allowed = ["title", "description", "assignees", "labels", "priority", "dueDate", "type"];
    for (const key of Object.keys(data)) {
      if (allowed.includes(key)) card[key] = data[key];
    }
    card.updatedAt = new Date();

    await board.save();
    return board;
  }

  async deleteCard(boardId, columnId, cardId) {
    const board = await ProjectBoard.findById(boardId);
    if (!board) throw new AppError("Project board not found.", 404);

    const column = board.columns.find((c) => c.id === columnId);
    if (!column) throw new AppError("Column not found.", 404);

    const idx = column.cards.findIndex((c) => c.id === cardId);
    if (idx === -1) throw new AppError("Card not found.", 404);

    column.cards.splice(idx, 1);
    column.cards.forEach((c, i) => { c.position = i; });

    await board.save();
    return board;
  }

  async moveCard(boardId, fromColumnId, toColumnId, cardId, newPosition) {
    const board = await ProjectBoard.findById(boardId);
    if (!board) throw new AppError("Project board not found.", 404);

    const fromColumn = board.columns.find((c) => c.id === fromColumnId);
    if (!fromColumn) throw new AppError("Source column not found.", 404);

    const toColumn = board.columns.find((c) => c.id === toColumnId);
    if (!toColumn) throw new AppError("Target column not found.", 404);

    const cardIdx = fromColumn.cards.findIndex((c) => c.id === cardId);
    if (cardIdx === -1) throw new AppError("Card not found.", 404);

    if (fromColumnId !== toColumnId && toColumn.wipLimit > 0 && toColumn.cards.length >= toColumn.wipLimit) {
      throw new AppError(`Target column "${toColumn.name}" has reached its WIP limit.`, 400);
    }

    const [card] = fromColumn.cards.splice(cardIdx, 1);
    card.updatedAt = new Date();

    const insertAt = newPosition != null ? newPosition : toColumn.cards.length;
    toColumn.cards.splice(insertAt, 0, card);

    fromColumn.cards.forEach((c, i) => { c.position = i; });
    toColumn.cards.forEach((c, i) => { c.position = i; });

    await board.save();
    return board;
  }

  async linkIssue(boardId, columnId, issueId) {
    const board = await ProjectBoard.findById(boardId);
    if (!board) throw new AppError("Project board not found.", 404);

    const column = board.columns.find((c) => c.id === columnId);
    if (!column) throw new AppError("Column not found.", 404);

    const existing = board.columns.some((col) =>
      col.cards.some((card) => card.issue && card.issue.toString() === issueId.toString())
    );
    if (existing) throw new AppError("Issue is already linked to this board.", 409);

    column.cards.push({
      id: crypto.randomUUID(),
      type: "issue",
      title: `Issue #${issueId}`,
      issue: issueId,
      position: column.cards.length,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    await board.save();
    return board;
  }
}

module.exports = new ProjectBoardService();
