import { useState, useEffect, useCallback } from "react";
import { useParams } from "react-router-dom";
import api from "../../api";
import { useAuth } from "../../authContext";
import { useDragAndDrop } from "../../hooks/useDragAndDrop";
import toast from "react-hot-toast";
import "./project-board.css";

const PRIORITY_LABELS = { critical: "Critical", high: "High", medium: "Medium", low: "Low" };

const ProjectBoard = () => {
  const { repoId } = useParams();
  const { currentUser } = useAuth();
  const { draggedItem, handleDragStart, handleDragOver, handleDrop, isDragging, dragOverTarget } = useDragAndDrop();

  const [board, setBoard] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showAddColumn, setShowAddColumn] = useState(false);
  const [newColumnName, setNewColumnName] = useState("");
  const [newColumnColor, setNewColumnColor] = useState("#7c3aed");
  const [addingCardCol, setAddingCardCol] = useState(null);
  const [newCardTitle, setNewCardTitle] = useState("");
  const [selectedCard, setSelectedCard] = useState(null);
  const [filterAssignee, setFilterAssignee] = useState("");
  const [filterLabel, setFilterLabel] = useState("");
  const [filterPriority, setFilterPriority] = useState("all");

  const fetchBoard = useCallback(async () => {
    try {
      const res = await api.get(`/v1/boards?repository=${repoId}`);
      const boards = res.data?.boards || res.data || [];
      setBoard(boards[0] || null);
    } catch (err) {
      if (err.name !== "CanceledError") {
        toast.error("Failed to load project board.");
      }
    } finally {
      setLoading(false);
    }
  }, [repoId]);

  useEffect(() => {
    const controller = new AbortController();
    fetchBoard();
    return () => controller.abort();
  }, [fetchBoard]);

  const handleCreateBoard = async () => {
    try {
      const res = await api.post("/v1/boards", {
        repository: repoId,
        name: "Project Board",
        description: "Manage your project tasks",
        columns: [
          { name: "To Do", color: "#6b7280", cards: [] },
          { name: "In Progress", color: "#3b82f6", cards: [] },
          { name: "Done", color: "#22c55e", cards: [] },
        ],
      });
      setBoard(res.data);
      toast.success("Board created!");
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to create board.");
    }
  };

  const handleAddColumn = async () => {
    if (!newColumnName.trim() || !board) return;
    try {
      const updatedColumns = [...(board.columns || []), { name: newColumnName, color: newColumnColor, cards: [], wipLimit: 0 }];
      const res = await api.put(`/v1/boards/${board._id}`, { columns: updatedColumns });
      setBoard(res.data || { ...board, columns: updatedColumns });
      setNewColumnName("");
      setShowAddColumn(false);
      toast.success("Column added!");
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to add column.");
    }
  };

  const handleAddCard = async (columnIndex) => {
    if (!newCardTitle.trim() || !board) return;
    try {
      const updatedColumns = board.columns.map((col, idx) => {
        if (idx === columnIndex) {
          return { ...col, cards: [...(col.cards || []), { title: newCardTitle, priority: "medium", labels: [], assignees: [], createdAt: new Date().toISOString() }] };
        }
        return col;
      });
      const res = await api.put(`/v1/boards/${board._id}`, { columns: updatedColumns });
      setBoard(res.data || { ...board, columns: updatedColumns });
      setNewCardTitle("");
      setAddingCardCol(null);
      toast.success("Card added!");
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to add card.");
    }
  };

  const handleCardMove = async (targetColumnIndex) => {
    if (!draggedItem || !board) return;
    const { sourceColumnIndex, cardIndex } = draggedItem;
    if (sourceColumnIndex === targetColumnIndex) return;

    const updatedColumns = board.columns.map((col, idx) => {
      const cards = [...(col.cards || [])];
      if (idx === sourceColumnIndex) {
        cards.splice(cardIndex, 1);
        return { ...col, cards };
      }
      if (idx === targetColumnIndex) {
        cards.push(board.columns[sourceColumnIndex].cards[cardIndex]);
        return { ...col, cards };
      }
      return col;
    });

    // Optimistic update
    setBoard((prev) => ({ ...prev, columns: updatedColumns }));

    try {
      const card = board.columns[sourceColumnIndex].cards[cardIndex];
      await api.put(`/v1/boards/${board._id}/cards/${card._id || "temp"}/move`, {
        fromColumn: sourceColumnIndex,
        toColumn: targetColumnIndex,
      });
    } catch {
      // Rollback
      setBoard((prev) => ({ ...prev, columns: board.columns }));
      toast.error("Failed to move card.");
    }
  };

  const filterCards = (cards) => {
    return (cards || []).filter((card) => {
      if (filterPriority !== "all" && card.priority !== filterPriority) return false;
      if (filterAssignee && !(card.assignees || []).some((a) => (a.username || a).toLowerCase().includes(filterAssignee.toLowerCase()))) return false;
      if (filterLabel && !(card.labels || []).some((l) => l.toLowerCase().includes(filterLabel.toLowerCase()))) return false;
      return true;
    });
  };

  if (loading) {
    return (
      <div className="pb-page">
        <div className="pb-loading" role="status" aria-label="Loading board">
          <div className="spinner" />
          <p>Loading project board...</p>
        </div>
      </div>
    );
  }

  if (!board) {
    return (
      <div className="pb-page">
        <div className="pb-empty">
          <h3>No project board yet</h3>
          <p>Create a Kanban board to manage your project tasks visually.</p>
          <button className="pb-create-btn" onClick={handleCreateBoard}>Create Board</button>
        </div>
      </div>
    );
  }

  return (
    <div className="pb-page">
      {/* Board Header */}
      <div className="pb-header">
        <div className="pb-header-info">
          <h1>{board.name || "Project Board"}</h1>
          {board.description && <p className="pb-header-desc">{board.description}</p>}
        </div>
        <button className="pb-add-col-btn" onClick={() => setShowAddColumn(!showAddColumn)}>+ Add Column</button>
      </div>

      {/* Filters */}
      <div className="pb-filters">
        <select
          className="pb-filter-select"
          value={filterPriority}
          onChange={(e) => setFilterPriority(e.target.value)}
          aria-label="Filter by priority"
        >
          <option value="all">All Priorities</option>
          <option value="critical">Critical</option>
          <option value="high">High</option>
          <option value="medium">Medium</option>
          <option value="low">Low</option>
        </select>
        <input
          type="text"
          className="pb-filter-input"
          placeholder="Filter by assignee..."
          value={filterAssignee}
          onChange={(e) => setFilterAssignee(e.target.value)}
          aria-label="Filter by assignee"
        />
        <input
          type="text"
          className="pb-filter-input"
          placeholder="Filter by label..."
          value={filterLabel}
          onChange={(e) => setFilterLabel(e.target.value)}
          aria-label="Filter by label"
        />
      </div>

      {/* Add Column Form */}
      {showAddColumn && (
        <div className="pb-add-col-form">
          <input
            type="text"
            placeholder="Column name"
            value={newColumnName}
            onChange={(e) => setNewColumnName(e.target.value)}
            className="pb-input"
            autoFocus
          />
          <input
            type="color"
            value={newColumnColor}
            onChange={(e) => setNewColumnColor(e.target.value)}
            className="pb-color-input"
            aria-label="Column color"
          />
          <button className="pb-btn-primary" onClick={handleAddColumn}>Add</button>
          <button className="pb-btn-cancel" onClick={() => setShowAddColumn(false)}>Cancel</button>
        </div>
      )}

      {/* Columns */}
      <div className="pb-board">
        {(board.columns || []).map((column, colIdx) => {
          const filteredColumnCards = filterCards(column.cards);
          const isOverLimit = column.wipLimit > 0 && filteredColumnCards.length > column.wipLimit;
          const isDropTarget = dragOverTarget?.columnId === colIdx;

          return (
            <div
              key={colIdx}
              className={`pb-column ${isDropTarget ? "pb-column-drop-target" : ""}`}
              onDragOver={(e) => handleDragOver(e, colIdx)}
              onDrop={() => handleDrop(colIdx, null, handleCardMove)}
            >
              <div className="pb-column-color-bar" style={{ backgroundColor: column.color || "#6b7280" }} />
              <div className="pb-column-header">
                <h3 className="pb-column-name">{column.name}</h3>
                <span className="pb-column-count">{filteredColumnCards.length}</span>
                {column.wipLimit > 0 && (
                  <span className={`pb-wip-badge ${isOverLimit ? "pb-wip-over" : ""}`}>
                    WIP: {filteredColumnCards.length}/{column.wipLimit}
                  </span>
                )}
              </div>

              <div className="pb-cards">
                {filteredColumnCards.map((card, cardIdx) => (
                  <div
                    key={card._id || cardIdx}
                    className={`pb-card ${isDragging && draggedItem?.cardIndex === cardIdx && draggedItem?.sourceColumnIndex === colIdx ? "pb-card-dragging" : ""}`}
                    draggable
                    onDragStart={() => handleDragStart({ sourceColumnIndex: colIdx, cardIndex: cardIdx, card })}
                    onClick={() => setSelectedCard({ ...card, columnIndex: colIdx, cardIndex: cardIdx })}
                  >
                    <div className={`pb-card-priority-bar pb-priority-${card.priority || "medium"}`} />
                    <div className="pb-card-body">
                      <span className="pb-card-title">{card.title}</span>
                      {card.labels && card.labels.length > 0 && (
                        <div className="pb-card-labels">
                          {card.labels.map((label, lIdx) => (
                            <span key={lIdx} className="pb-card-label">{label}</span>
                          ))}
                        </div>
                      )}
                      <div className="pb-card-footer">
                        {card.dueDate && (
                          <span className="pb-card-due">{new Date(card.dueDate).toLocaleDateString()}</span>
                        )}
                        {card.assignees && card.assignees.length > 0 && (
                          <div className="pb-card-assignees">
                            {card.assignees.slice(0, 3).map((assignee, aIdx) => (
                              <span key={aIdx} className="pb-avatar" title={assignee.username || assignee}>
                                {(assignee.username || assignee || "?").charAt(0).toUpperCase()}
                              </span>
                            ))}
                            {card.assignees.length > 3 && (
                              <span className="pb-avatar pb-avatar-more">+{card.assignees.length - 3}</span>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}

                {/* Drag placeholder */}
                {isDragging && isDropTarget && (
                  <div className="pb-card-placeholder" />
                )}
              </div>

              {/* Add Card */}
              {addingCardCol === colIdx ? (
                <div className="pb-add-card-form">
                  <input
                    type="text"
                    placeholder="Card title..."
                    value={newCardTitle}
                    onChange={(e) => setNewCardTitle(e.target.value)}
                    className="pb-input pb-input-sm"
                    autoFocus
                    onKeyDown={(e) => { if (e.key === "Enter") handleAddCard(colIdx); if (e.key === "Escape") setAddingCardCol(null); }}
                  />
                  <div className="pb-add-card-actions">
                    <button className="pb-btn-primary pb-btn-sm" onClick={() => handleAddCard(colIdx)}>Add</button>
                    <button className="pb-btn-cancel pb-btn-sm" onClick={() => { setAddingCardCol(null); setNewCardTitle(""); }}>Cancel</button>
                  </div>
                </div>
              ) : (
                <button className="pb-add-card-btn" onClick={() => { setAddingCardCol(colIdx); setNewCardTitle(""); }}>+ Add card</button>
              )}
            </div>
          );
        })}
      </div>

      {/* Card Detail Modal */}
      {selectedCard && (
        <div className="pb-modal-overlay" onClick={() => setSelectedCard(null)}>
          <div className="pb-modal" onClick={(e) => e.stopPropagation()}>
            <div className="pb-modal-header">
              <h2>{selectedCard.title}</h2>
              <button className="pb-modal-close" onClick={() => setSelectedCard(null)} aria-label="Close">&times;</button>
            </div>
            <div className="pb-modal-body">
              <div className="pb-modal-field">
                <span className="pb-modal-label">Priority</span>
                <span className={`pb-priority-badge pb-priority-${selectedCard.priority || "medium"}`}>
                  {PRIORITY_LABELS[selectedCard.priority] || "Medium"}
                </span>
              </div>
              {selectedCard.description && (
                <div className="pb-modal-field">
                  <span className="pb-modal-label">Description</span>
                  <p className="pb-modal-desc">{selectedCard.description}</p>
                </div>
              )}
              {selectedCard.labels && selectedCard.labels.length > 0 && (
                <div className="pb-modal-field">
                  <span className="pb-modal-label">Labels</span>
                  <div className="pb-card-labels">
                    {selectedCard.labels.map((l, i) => <span key={i} className="pb-card-label">{l}</span>)}
                  </div>
                </div>
              )}
              {selectedCard.assignees && selectedCard.assignees.length > 0 && (
                <div className="pb-modal-field">
                  <span className="pb-modal-label">Assignees</span>
                  <div className="pb-modal-assignees">
                    {selectedCard.assignees.map((a, i) => (
                      <span key={i} className="pb-modal-assignee">
                        <span className="pb-avatar">{(a.username || a || "?").charAt(0).toUpperCase()}</span>
                        <span>{a.username || a}</span>
                      </span>
                    ))}
                  </div>
                </div>
              )}
              {selectedCard.dueDate && (
                <div className="pb-modal-field">
                  <span className="pb-modal-label">Due Date</span>
                  <span>{new Date(selectedCard.dueDate).toLocaleDateString()}</span>
                </div>
              )}
              {selectedCard.createdAt && (
                <div className="pb-modal-field">
                  <span className="pb-modal-label">Created</span>
                  <span className="pb-modal-meta">{new Date(selectedCard.createdAt).toLocaleDateString()}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProjectBoard;
