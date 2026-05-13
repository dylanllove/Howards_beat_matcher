import { useCallback } from 'react';
import type { Cut, CutState } from '../types';
import { clamp, makeId } from '../utils/time';
import { useUndoRedo } from './useUndoRedo';

export function useCuts(duration: number) {
  const history = useUndoRedo<Cut[]>([]);
  const sort = (cuts: Cut[]) => [...cuts].sort((a, b) => a.time - b.time);
  const addCut = useCallback((time: number, state: CutState = 'manual') => history.setPresent((cuts) => sort([...cuts, { id: makeId(), time: clamp(time, 0, duration), state }])), [duration, history]);
  const addCuts = useCallback((times: number[], state: CutState = 'suggested') => history.setPresent((cuts) => sort([...cuts, ...times.map((time) => ({ id: makeId(), time: clamp(time, 0, duration), state }))])), [duration, history]);
  const removeCut = useCallback((id: string | null) => { if (id) history.setPresent((cuts) => cuts.filter((cut) => cut.id !== id)); }, [history]);
  const moveCut = useCallback((id: string, time: number) => history.setPresent((cuts) => sort(cuts.map((cut) => cut.id === id ? { ...cut, time: clamp(time, 0, duration), state: cut.state === 'suggested' ? 'adjusted' : cut.state } : cut))), [duration, history]);
  return { cuts: history.present, setCuts: history.setPresent, resetCuts: history.reset, addCut, addCuts, removeCut, moveCut, undo: history.undo, redo: history.redo, canUndo: history.canUndo, canRedo: history.canRedo };
}
