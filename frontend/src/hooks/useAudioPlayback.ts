import { useEffect, useMemo, useRef, useState } from 'react';
import type { Cut } from '../types';

const CROSSING_EPSILON_SECONDS = 0.002;
const MAX_PLAYBACK_TICK_SECONDS = 5;

export function useAudioPlayback(file: File | null, cuts: Cut[], selectedCutId: string | null, onCutFlash: () => void) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const cutsRef = useRef<Cut[]>(cuts);
  const selectedCutIdRef = useRef<string | null>(selectedCutId);
  const loopEnabledRef = useRef(false);
  const loopWindowRef = useRef(1);
  const onCutFlashRef = useRef(onCutFlash);
  const previousTimeRef = useRef(0);
  const flashedInPassRef = useRef<Set<string>>(new Set());
  const [currentTime, setCurrentTime] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [loopEnabled, setLoopEnabledState] = useState(false);
  const [loopWindow, setLoopWindowState] = useState(1);
  const url = useMemo(() => file ? URL.createObjectURL(file) : '', [file]);

  useEffect(() => {
    cutsRef.current = cuts;
    flashedInPassRef.current.clear();
  }, [cuts]);
  useEffect(() => { selectedCutIdRef.current = selectedCutId; }, [selectedCutId]);
  useEffect(() => { loopEnabledRef.current = loopEnabled; }, [loopEnabled]);
  useEffect(() => { loopWindowRef.current = loopWindow; }, [loopWindow]);
  useEffect(() => { onCutFlashRef.current = onCutFlash; }, [onCutFlash]);
  useEffect(() => () => { if (url) URL.revokeObjectURL(url); }, [url]);

  useEffect(() => {
    if (!url) return;
    const audio = new Audio(url);
    audioRef.current = audio;
    previousTimeRef.current = 0;
    flashedInPassRef.current.clear();

    const resetCrossingPass = () => {
      previousTimeRef.current = audio.currentTime;
      flashedInPassRef.current.clear();
    };

    const tick = () => {
      const previousTime = previousTimeRef.current;
      const nextTime = audio.currentTime;
      setCurrentTime(nextTime);

      const selected = cutsRef.current.find((cut) => cut.id === selectedCutIdRef.current);
      if (loopEnabledRef.current && selected) {
        const start = Math.max(0, selected.time - loopWindowRef.current);
        const end = selected.time + loopWindowRef.current;
        if (nextTime > end) {
          audio.currentTime = start;
          setCurrentTime(start);
          previousTimeRef.current = start;
          flashedInPassRef.current.clear();
          return;
        }
      }

      const delta = nextTime - previousTime;
      const isNormalPlaybackTick = !audio.paused && delta > 0 && delta <= MAX_PLAYBACK_TICK_SECONDS;
      if (isNormalPlaybackTick) {
        const crossed = cutsRef.current
          .filter((cut) => cut.time > previousTime + CROSSING_EPSILON_SECONDS && cut.time <= nextTime + CROSSING_EPSILON_SECONDS)
          .sort((a, b) => a.time - b.time);
        const firstNewCrossing = crossed.find((cut) => !flashedInPassRef.current.has(cut.id));
        if (firstNewCrossing) {
          flashedInPassRef.current.add(firstNewCrossing.id);
          onCutFlashRef.current();
        }
      } else if (Math.abs(delta) > CROSSING_EPSILON_SECONDS) {
        flashedInPassRef.current.clear();
      }

      previousTimeRef.current = nextTime;
    };

    const stop = () => setIsPlaying(false);
    audio.addEventListener('timeupdate', tick);
    audio.addEventListener('seeking', resetCrossingPass);
    audio.addEventListener('play', resetCrossingPass);
    audio.addEventListener('ended', stop);
    return () => {
      audio.pause();
      audio.removeEventListener('timeupdate', tick);
      audio.removeEventListener('seeking', resetCrossingPass);
      audio.removeEventListener('play', resetCrossingPass);
      audio.removeEventListener('ended', stop);
      if (audioRef.current === audio) audioRef.current = null;
    };
  }, [url]);

  const seek = (time: number) => {
    if (audioRef.current) audioRef.current.currentTime = time;
    previousTimeRef.current = time;
    flashedInPassRef.current.clear();
    setCurrentTime(time);
  };
  const toggle = () => {
    const audio = audioRef.current;
    if (!audio) return;
    if (audio.paused) {
      previousTimeRef.current = audio.currentTime;
      flashedInPassRef.current.clear();
      void audio.play();
      setIsPlaying(true);
    } else {
      audio.pause();
      setIsPlaying(false);
    }
  };
  const setLoopEnabled = (value: boolean) => {
    loopEnabledRef.current = value;
    setLoopEnabledState(value);
  };
  const setLoopWindow = (value: number) => {
    loopWindowRef.current = value;
    setLoopWindowState(value);
  };
  return { currentTime, isPlaying, seek, toggle, loopEnabled, setLoopEnabled, loopWindow, setLoopWindow };
}
