import { useEffect, useMemo, useRef, useState } from 'react';
import type { MouseEvent, PointerEvent } from 'react';
import type { Cut } from '../types';
import { clamp, formatTime } from '../utils/time';

type Props = {
  peaks: number[];
  duration: number;
  cuts: Cut[];
  selectedCutId: string | null;
  currentTime: number;
  isPlaying: boolean;
  zoom: number;
  onZoom: (z: number) => void;
  onSeek: (time: number) => void;
  onAddCut: (time: number) => void;
  onMoveCut: (id: string, time: number) => void;
  onSelectCut: (id: string | null) => void;
  onRemoveCut: (id: string | null) => void;
};

type ContextMenuState = { x: number; y: number; time: number };

const markerClass = (cut: Cut, selected: boolean) => {
  if (selected) return 'bg-howards shadow-[0_0_14px_rgba(0,168,107,0.9)] ring-1 ring-emerald-200';
  if (cut.state === 'suggested') return 'bg-slate-300/90';
  if (cut.state === 'manual') return 'bg-white shadow-[0_0_8px_rgba(255,255,255,0.35)]';
  if (cut.state === 'adjusted') return 'bg-howards shadow-[0_0_8px_rgba(0,168,107,0.55)]';
  return 'bg-emerald-100';
};

export default function WaveformTimeline(p: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const [dragCut, setDragCut] = useState<string | null>(null);
  const [context, setContext] = useState<ContextMenuState | null>(null);

  const width = Math.max(900, p.duration * 80 * p.zoom);
  const waveformHeight = 190;
  const rulerStep = p.zoom > 4 ? 1 : 5;
  const timeToX = (time: number) => (time / Math.max(p.duration, 0.001)) * width;
  const xToTime = (x: number) => clamp((x / width) * p.duration, 0, p.duration);
  const selectedCut = useMemo(() => p.cuts.find((c) => c.id === p.selectedCutId), [p.cuts, p.selectedCutId]);

  useEffect(() => {
    if (!context) return undefined;

    const closeOnOutsideClick = (event: globalThis.PointerEvent) => {
      if (!menuRef.current?.contains(event.target as Node)) setContext(null);
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setContext(null);
    };

    window.addEventListener('pointerdown', closeOnOutsideClick);
    window.addEventListener('keydown', closeOnEscape);
    return () => {
      window.removeEventListener('pointerdown', closeOnOutsideClick);
      window.removeEventListener('keydown', closeOnEscape);
    };
  }, [context]);

  useEffect(() => {
    if (p.isPlaying) setContext(null);
  }, [p.isPlaying]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const dpr = window.devicePixelRatio || 1;
    const height = waveformHeight;
    const center = height / 2;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, width, height);

    const background = ctx.createLinearGradient(0, 0, 0, height);
    background.addColorStop(0, '#151820');
    background.addColorStop(0.5, '#111319');
    background.addColorStop(1, '#151820');
    ctx.fillStyle = background;
    ctx.fillRect(0, 0, width, height);

    const gridStep = p.zoom > 8 ? 0.5 : p.zoom > 4 ? 1 : p.zoom > 2 ? 2 : 5;
    ctx.lineWidth = 1;
    for (let t = 0; t <= p.duration; t += gridStep) {
      const major = Math.abs(t % 5) < 0.001;
      const x = timeToX(t);
      ctx.strokeStyle = major ? 'rgba(86, 96, 115, 0.34)' : 'rgba(86, 96, 115, 0.16)';
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
      ctx.stroke();
    }

    ctx.strokeStyle = 'rgba(226, 232, 240, 0.18)';
    ctx.beginPath();
    ctx.moveTo(0, center);
    ctx.lineTo(width, center);
    ctx.stroke();

    const peakCount = Math.max(p.peaks.length, 1);
    const stepX = width / peakCount;
    const smoothPeaks = p.peaks.map((peak, index, source) => {
      const previous = source[index - 1] ?? peak;
      const next = source[index + 1] ?? peak;
      return (previous * 0.2 + peak * 0.6 + next * 0.2) ** 0.72;
    });

    const top = new Path2D();
    const bottom = new Path2D();
    top.moveTo(0, center);
    bottom.moveTo(width, center);

    smoothPeaks.forEach((peak, index) => {
      const x = index * stepX;
      const amplitude = Math.max(2, peak * (height * 0.44));
      top.lineTo(x, center - amplitude);
    });

    for (let index = smoothPeaks.length - 1; index >= 0; index -= 1) {
      const x = index * stepX;
      const amplitude = Math.max(2, smoothPeaks[index] * (height * 0.44));
      bottom.lineTo(x, center + amplitude);
    }

    top.lineTo(width, center);
    bottom.lineTo(0, center);

    const fill = ctx.createLinearGradient(0, 0, 0, height);
    fill.addColorStop(0, 'rgba(32, 235, 157, 0.92)');
    fill.addColorStop(0.5, 'rgba(0, 168, 107, 0.46)');
    fill.addColorStop(1, 'rgba(32, 235, 157, 0.92)');
    ctx.fillStyle = fill;
    ctx.fill(top);
    ctx.fill(bottom);

    ctx.strokeStyle = 'rgba(176, 255, 224, 0.72)';
    ctx.lineWidth = 1.25;
    ctx.stroke(top);
    ctx.stroke(bottom);
  }, [p.peaks, p.duration, p.zoom, width]);

  const pointerTime = (event: PointerEvent | MouseEvent) => {
    const rect = (event.currentTarget as HTMLElement).getBoundingClientRect();
    return xToTime(event.clientX - rect.left);
  };

  const zoomAroundPlayhead = (nextZoom: number) => {
    setContext(null);
    const scroller = scrollRef.current;
    const playheadX = timeToX(p.currentTime);
    const ratio = playheadX / width;
    p.onZoom(nextZoom);
    requestAnimationFrame(() => {
      if (scroller) scroller.scrollLeft = Math.max(0, ratio * Math.max(900, p.duration * 80 * nextZoom) - scroller.clientWidth / 2);
    });
  };

  return (
    <div className="rounded border border-premiere-700 bg-premiere-900 shadow-xl">
      <div className="flex items-center gap-3 border-b border-premiere-700 px-4 py-2 text-sm">
        <span className="text-slate-300">Zoom {p.zoom.toFixed(1)}x</span>
        <button onClick={() => zoomAroundPlayhead(p.zoom / 1.25)} className="rounded bg-premiere-800 px-2 hover:bg-premiere-700">−</button>
        <input type="range" min={1} max={18} step={0.1} value={p.zoom} onChange={(e) => zoomAroundPlayhead(Number(e.target.value))} className="accent-howards" />
        <button onClick={() => zoomAroundPlayhead(p.zoom * 1.25)} className="rounded bg-premiere-800 px-2 hover:bg-premiere-700">+</button>
        <span className="ml-auto text-slate-500">Right-click timeline to add a cut. Drag markers or playhead to edit.</span>
      </div>

      <div
        ref={scrollRef}
        className="overflow-x-auto"
        onScroll={() => setContext(null)}
        onWheel={(e) => {
          setContext(null);
          if (Math.abs(e.deltaY) < Math.abs(e.deltaX)) return;
          e.preventDefault();
          const scroller = scrollRef.current;
          if (!scroller) return;
          const rect = scroller.getBoundingClientRect();
          const cursorX = e.clientX - rect.left + scroller.scrollLeft;
          const ratio = cursorX / width;
          const next = clamp(p.zoom * (e.deltaY < 0 ? 1.12 : 0.88), 1, 18);
          p.onZoom(next);
          requestAnimationFrame(() => {
            scroller.scrollLeft = ratio * Math.max(900, p.duration * 80 * next) - (e.clientX - rect.left);
          });
        }}
      >
        <div
          className="relative h-64"
          style={{ width }}
          onContextMenu={(e) => {
            e.preventDefault();
            setContext({ x: e.clientX, y: e.clientY, time: pointerTime(e) });
          }}
          onPointerDown={(e) => {
            if ((e.target as HTMLElement).dataset.marker) return;
            p.onSeek(pointerTime(e));
            p.onSelectCut(null);
          }}
          onPointerMove={(e) => {
            if (dragCut) p.onMoveCut(dragCut, pointerTime(e));
            if (e.buttons === 1 && !dragCut && !(e.target as HTMLElement).dataset.marker) p.onSeek(pointerTime(e));
          }}
          onPointerUp={() => setDragCut(null)}
        >
          <div className="relative h-12 border-b border-premiere-700 bg-premiere-950">
            {Array.from({ length: Math.ceil(p.duration / rulerStep) + 1 }).map((_, i) => {
              const t = i * rulerStep;
              return (
                <span key={t} className="absolute top-2 -translate-x-1/2 font-mono text-xs text-slate-500" style={{ left: timeToX(t) }}>
                  {formatTime(t).slice(0, 5)}
                </span>
              );
            })}
          </div>

          <canvas ref={canvasRef} className="absolute top-12" />
          <div className="absolute top-12 h-[190px] w-[2px] -translate-x-1/2 bg-red-400 shadow-[0_0_10px_rgba(248,113,113,0.65)]" style={{ left: timeToX(p.currentTime) }} />

          {p.cuts.map((cut) => (
            <button
              key={cut.id}
              data-marker="true"
              title={formatTime(cut.time)}
              onPointerDown={(e) => {
                e.stopPropagation();
                setContext(null);
                (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
                setDragCut(cut.id);
                p.onSelectCut(cut.id);
              }}
              onDoubleClick={() => p.onRemoveCut(cut.id)}
              className={`absolute top-12 h-[190px] w-[3px] -translate-x-1/2 rounded-full ${markerClass(cut, cut.id === p.selectedCutId)}`}
              style={{ left: timeToX(cut.time) }}
            />
          ))}
        </div>
      </div>

      {context && (
        <div ref={menuRef} className="fixed z-50 rounded border border-premiere-600 bg-premiere-900 p-1 shadow-xl" style={{ left: context.x, top: context.y }}>
          <button
            className="block px-4 py-2 text-sm hover:bg-premiere-700"
            onClick={() => {
              p.onAddCut(context.time);
              setContext(null);
            }}
          >
            Add Cut
          </button>
          {selectedCut && (
            <button
              className="block px-4 py-2 text-sm hover:bg-premiere-700"
              onClick={() => {
                p.onRemoveCut(selectedCut.id);
                setContext(null);
              }}
            >
              Remove Selected Cut
            </button>
          )}
        </div>
      )}
    </div>
  );
}
