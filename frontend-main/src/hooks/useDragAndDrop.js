import { useState, useCallback } from "react";

export function useDragAndDrop() {
  const [draggedItem, setDraggedItem] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dragOverTarget, setDragOverTarget] = useState(null);

  const handleDragStart = useCallback((item) => {
    setDraggedItem(item);
    setIsDragging(true);
  }, []);

  const handleDragOver = useCallback((e, columnId, position) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    setDragOverTarget({ columnId, position: position ?? null });
  }, []);

  const handleDrop = useCallback((targetColumnId, targetPosition, callback) => {
    if (draggedItem && callback) {
      callback(targetColumnId, targetPosition);
    }
    setDraggedItem(null);
    setIsDragging(false);
    setDragOverTarget(null);
  }, [draggedItem]);

  const handleDragEnd = useCallback(() => {
    setDraggedItem(null);
    setIsDragging(false);
    setDragOverTarget(null);
  }, []);

  return {
    draggedItem,
    setDraggedItem,
    handleDragStart,
    handleDragOver,
    handleDrop,
    handleDragEnd,
    isDragging,
    dragOverTarget,
  };
}
