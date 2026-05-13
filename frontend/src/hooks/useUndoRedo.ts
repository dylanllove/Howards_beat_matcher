import { useCallback, useState } from 'react';

export function useUndoRedo<T>(initial: T) {
  const [past, setPast] = useState<T[]>([]);
  const [present, setPresentState] = useState<T>(initial);
  const [future, setFuture] = useState<T[]>([]);
  const setPresent = useCallback((next: T | ((current: T) => T)) => {
    setPresentState((current) => {
      const value = typeof next === 'function' ? (next as (current: T) => T)(current) : next;
      setPast((p) => [...p, current]); setFuture([]); return value;
    });
  }, []);
  const reset = useCallback((next: T) => { setPast([]); setPresentState(next); setFuture([]); }, []);
  const undo = useCallback(() => setPast((p) => { if (!p.length) return p; const previous = p[p.length - 1]; setFuture((f) => [present, ...f]); setPresentState(previous); return p.slice(0, -1); }), [present]);
  const redo = useCallback(() => setFuture((f) => { if (!f.length) return f; const next = f[0]; setPast((p) => [...p, present]); setPresentState(next); return f.slice(1); }), [present]);
  return { present, setPresent, reset, undo, redo, canUndo: past.length > 0, canRedo: future.length > 0 };
}
