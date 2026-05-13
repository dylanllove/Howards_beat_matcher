import { useEffect, useMemo, useRef, useState } from 'react';
import type { Cut } from '../types';

export function useAudioPlayback(file: File | null, cuts: Cut[], selectedCutId: string | null, onCutFlash: () => void) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const lastFlashRef = useRef<string | null>(null);
  const [currentTime, setCurrentTime] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [loopEnabled, setLoopEnabled] = useState(false);
  const [loopWindow, setLoopWindow] = useState(1);
  const url = useMemo(() => file ? URL.createObjectURL(file) : '', [file]);
  useEffect(() => () => { if (url) URL.revokeObjectURL(url); }, [url]);
  useEffect(() => { if (!url) return; const audio = new Audio(url); audioRef.current = audio; const tick = () => { setCurrentTime(audio.currentTime); const selected = cuts.find((cut) => cut.id === selectedCutId); if (loopEnabled && selected) { const start = Math.max(0, selected.time - loopWindow); const end = selected.time + loopWindow; if (audio.currentTime > end) audio.currentTime = start; } const hit = cuts.find((cut) => Math.abs(audio.currentTime - cut.time) < 0.035); if (hit && lastFlashRef.current !== hit.id) { lastFlashRef.current = hit.id; onCutFlash(); } if (!hit) lastFlashRef.current = null; }; const stop = () => setIsPlaying(false); audio.addEventListener('timeupdate', tick); audio.addEventListener('ended', stop); return () => { audio.pause(); audio.removeEventListener('timeupdate', tick); audio.removeEventListener('ended', stop); }; }, [url, cuts, selectedCutId, loopEnabled, loopWindow, onCutFlash]);
  const seek = (time: number) => { if (audioRef.current) audioRef.current.currentTime = time; setCurrentTime(time); };
  const toggle = () => { const audio = audioRef.current; if (!audio) return; if (audio.paused) { void audio.play(); setIsPlaying(true); } else { audio.pause(); setIsPlaying(false); } };
  return { currentTime, isPlaying, seek, toggle, loopEnabled, setLoopEnabled, loopWindow, setLoopWindow };
}
