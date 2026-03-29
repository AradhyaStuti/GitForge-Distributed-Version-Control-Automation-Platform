'use strict';

const crypto = require("crypto");
const ProjectBoard = require("../models/ProjectBoard");
const { AppError } = require("../middleware/errorHandler");

class ProjectBoardService {
  // ── Controller-facing methods (match projectBoardController.js signatures) ──

  async create({ name, description, repository, owner, visibility, members }) {
    return ProjectBoard.create({
      name,
      description: description || "",
      repository: repository || null,
      owner,
      visibility: visibility || "private",
      members: members || [],
    });
  }

  async list({ repository, user, page = 1, limit = 20 } = {}) {
    const filter = { archived: false };
    if (repository) filter.repository = repository;
    if (user) filter.$or = [{ owner: user }, { "members.user": user }];
    const skip = (page - 1) * limit;

    const [boards, total] = await Promise.all([
      ProjectBoard.find(filter)
        .populate("owner", "username email")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      ProjectBoard.countDocuments(filter),
    ]);

    return { boards, pagination: { page, limit, total, pages: Math.ceil(total / limit) } };
  }

  async getById(id) {
    const board = await ProjectBoard.findById(id)
      .populate("owner", "username email")
      .populate("members.user", "username email")
      .populate("columns.cards.assignees", "username email")
      .populate("columns.cards.createdBy", "username email");

    if (!board) throw new AppError("Project board not found.", 404);
    return board;
  }

  async update(id, userId, data) {
    const board = await ProjectBoard.findById(id);
    if (!board) throw new AppError("Project board not found.", 404);

    const allowed = ["name", "description", "visibility", "settings", "archived"];
    for (const key of Object.keys(data)) {
      if (allowed.includes(key)) board[key] = data[key];
    }

    await board.save();
    return board;
  }

  async delete(id, userId) {
    const board = await ProjectBoard.findByIdAndDelete(id);
    if (!board) throw new AppError("Project board not found.", 404);
    return { message: "Project board deleted." };
  }

  async addColumn(boardId, userId, columnData) {
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

  async updateColumn(boardId, columnId, userId, data) {
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

  async deleteColumn(boardId, columnId, userId) {
    const board = await ProjectBoard.findById(boardId);
    if (!board) throw new AppError("Project board not found.", 404);

    const idx = board.columns.findIndex((c) => c.id === columnId);
    if (idx === -1) throw new AppError("Column not found.", 404);

    board.columns.splice(idx, 1);
    board.columns.forEach((col, i) => { col.position = i; });

    await board.save();
    return board;
  }

  async moveColumn(boardId, columnId, userId, { position }) {
    const board = await ProjectBoard.findById(boardId);
    if (!board) throw new AppError("Project board not found.", 404);

    const idx = board.columns.findIndex((c) => c.id === columnId);
    if (idx === -1) throw new AppError("Column not found.", 404);

    const [column] = board.columns.splice(idx, 1);
    board.columns.splice(position, 0, column);
    board.columns.forEach((col, i) => { col.position = i; });

    await board.save();
    return board;
  }

  async addCard(boardId, columnId, userId, cardData) {
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
      createdBy: userId,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    await board.save();
    return board;
  }

  async updateCard(boardId, columnId, cardId, userId, data) {
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

  async deleteCard(boardId, columnId, cardId, userId) {
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

  async moveCard(boardId, cardId, userId, { fromColumn, toColumn, position }) {
    const board = await ProjectBoard.findById(boardId);
    if (!board) throw new AppError("Project board not found.", 404);

    const fromCol = board.columns.find((c) => c.id === fromColumn);
    if (!fromCol) throw new AppError("Source column not found.", 404);

    const toCol = board.columns.find((c) => c.id === toColumn);
    if (!toCol) throw new AppError("Target column not found.", 404);

    const cardIdx = fromCol.cards.findIndex((c) => c.id === cardId);
    if (cardIdx === -1) throw new AppError("Card not found.", 404);

    if (fromColumn !== toColumn && toCol.wipLimit > 0 && toCol.cards.length >= toCol.wipLimit) {
      throw new AppError(`Target column "${toCol.name}" has reached its WIP limit.`, 400);
    }

    const [card] = fromCol.cards.splice(cardIdx, 1);
    card.updatedAt = new Date();

    const insertAt = position !== null && position !== undefined ? position : toCol.cards.length;
    toCol.cards.splice(insertAt, 0, card);

    fromCol.cards.forEach((c, i) => { c.position = i; });
    toCol.cards.forEach((c, i) => { c.position = i; });

    await board.save();
    return board;
  }
}

module.exports = new ProjectBoardService();
