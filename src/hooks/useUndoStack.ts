import { useState, useCallback } from 'react';

interface UndoAction {
  description: string;
  undo: () => Promise<void> | void;
}

export function useUndoStack(maxSize: number = 20) {
  const [stack, setStack] = useState<UndoAction[]>([]);

  const push = useCallback((action: UndoAction) => {
    setStack(prev => [...prev.slice(-(maxSize - 1)), action]);
  }, [maxSize]);

  const undo = useCallback(async () => {
    const action = stack[stack.length - 1];
    if (!action) return null;
    await action.undo();
    setStack(prev => prev.slice(0, -1));
    return action.description;
  }, [stack]);

  const canUndo = stack.length > 0;
  const lastAction = stack[stack.length - 1]?.description || null;

  return { push, undo, canUndo, lastAction, stackSize: stack.length };
}
