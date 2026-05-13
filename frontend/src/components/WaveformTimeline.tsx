import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { MouseEvent, PointerEvent } from 'react';
import type { Cut } from '../types';
import { clamp, formatTime } from '../utils/time';

type Props = { peaks: number[]; duration: number; cuts: Cut[]; selectedCutId: string | null; currentTime: number; isPlaying: boolean; zoom: number; onZoom: (z: number) => void; onSeek: (time: number) => void; onAddCut: (time: number) => void; onMoveCut: (id: string, time: number) => void; onSelectCut: (id: string | null) => void; onRemoveCut: (id: string | null) => void };

type Viewport = { scrollLeft: number; width: number };

const TIMELINE_HEIGHT = 190;
const RULER_HEIGHT = 48;
const MIN_TIMELINE_WIDTH = 900;
const PIXELS_PER_SECOND = 80;

const markerClass = (cut: Cut, selected: boolean) => selected ? 'bg-howards shadow-[0_0_14px_rgba(0,168,107,.8)] ring-1 ring-emerald-200' : cut.state === 'suggested' ? 'bg-slate-300/90' : cut.state === 'manual' ? 'bg-white' : cut.state === 'adjusted' ? 'bg-howards' : 'bg-emerald-200';

export default function WaveformTimeline(p: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const contextRef = useRef<HTMLDivElement>(null);
  const [dragCut, setDragCut] = useState<string | null>(null);
  const [context, setContext] = useState<{ x: number; y: number; time: number } | null>(null);
  const [viewport, setViewport] = useState<Viewport>({ scrollLeft: 0, width: MIN_TIMELINE_WIDTH });
  const width = Math.max(MIN_TIMELINE_WIDTH, p.duration * PIXELS_PER_SECOND * p.zoom);
  const timeToX = (time: number) => (time / Math.max(p.duration, 0.001)) * width;
  const xToTime = (x: number) => clamp((x / width) * p.duration, 0, p.duration);
  const selectedCut = useMemo(() => p.cuts.find((c) => c.id === p.selectedCutId), [p.cuts, p.selectedCutId]);
  const closeContext = useCallback(() => setContext(null), []);
  const updateViewport = useCallback(() => {
    const scroller = scrollRef.current;
    if (!scroller) return;
    setViewport({ scrollLeft: scroller.scrollLeft, width: Math.max(1, scroller.clientWidth) });
  }, []);

  useEffect(() => {
    updateViewport();
    window.addEventListener('resize', updateViewport);
    return () => window.removeEventListener('resize', updateViewport);
  }, [updateViewport, width]);

  useEffect(() => {
    if (!context) return;
    const onPointerDown = (event: globalThis.PointerEvent) => { if (!contextRef.current?.contains(event.target as Node)) closeContext(); };
    const onKeyDown = (event: KeyboardEvent) => { if (event.key === 'Escape') closeContext(); };
    window.addEventListener('pointerdown', onPointerDown, true);
    window.addEventListener('keydown', onKeyDown);
    return () => { window.removeEventListener('pointerdown', onPointerDown, true); window.removeEventListener('keydown', onKeyDown); };
  }, [closeContext, context]);

  useEffect(() => { if (p.isPlaying) closeContext(); }, [closeContext, p.isPlaying]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const visibleWidth = Math.max(1, Math.ceil(viewport.width));
    canvas.width = visibleWidth * dpr;
    canvas.height = TIMELINE_HEIGHT * dpr;
    canvas.style.width = `${visibleWidth}px`;
    canvas.style.height = `${TIMELINE_HEIGHT}px`;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, visibleWidth, TIMELINE_HEIGHT);

    const visibleStartX = viewport.scrollLeft;
    const visibleEndX = viewport.scrollLeft + visibleWidth;
    const localX = (worldX: number) => worldX - visibleStartX;
    const visibleStartTime = xToTime(visibleStartX);
    const visibleEndTime = xToTime(visibleEndX);
    const center = TIMELINE_HEIGHT / 2;
    const clipTop = 18;
    const clipBottom = TIMELINE_HEIGHT - 18;
    const clipHeight = clipBottom - clipTop;

    const background = ctx.createLinearGradient(0, 0, 0, TIMELINE_HEIGHT);
    background.addColorStop(0, '#20242b');
    background.addColorStop(1, '#15181e');
    ctx.fillStyle = background;
    ctx.fillRect(0, 0, visibleWidth, TIMELINE_HEIGHT);

    const clipStart = Math.max(0, localX(0));
    const clipEnd = Math.min(visibleWidth, localX(width));
    if (clipEnd > clipStart) {
      const clipFill = ctx.createLinearGradient(0, clipTop, 0, clipBottom);
      clipFill.addColorStop(0, 'rgba(0, 130, 84, 0.68)');
      clipFill.addColorStop(1, 'rgba(0, 82, 60, 0.78)');
      ctx.fillStyle = clipFill;
      ctx.fillRect(clipStart, clipTop, clipEnd - clipStart, clipHeight);
      ctx.strokeStyle = 'rgba(81, 255, 183, 0.24)';
      ctx.lineWidth = 1;
      ctx.strokeRect(clipStart + 0.5, clipTop + 0.5, Math.max(0, clipEnd - clipStart - 1), clipHeight - 1);
    }

    const gridStep = p.zoom > 8 ? 0.25 : p.zoom > 4 ? 0.5 : p.zoom > 2 ? 1 : 5;
    const firstGrid = Math.max(0, Math.floor(visibleStartTime / gridStep) * gridStep);
    for (let t = firstGrid; t <= Math.min(p.duration, visibleEndTime + gridStep); t += gridStep) {
      const x = localX(timeToX(t));
      const major = Math.abs(t - Math.round(t)) < 0.001;
      ctx.strokeStyle = major ? 'rgba(226, 232, 240, 0.12)' : 'rgba(226, 232, 240, 0.055)';
      ctx.lineWidth = major ? 1 : 0.75;
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, TIMELINE_HEIGHT);
      ctx.stroke();
    }

    ctx.strokeStyle = 'rgba(220, 252, 231, 0.28)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, center);
    ctx.lineTo(visibleWidth, center);
    ctx.stroke();

    if (p.peaks.length > 0 && p.duration > 0) {
      const points: { x: number; amp: number }[] = [];
      const stepPx = 3;
      const smoothingWindow = Math.max(3, Math.round(14 / Math.max(p.zoom, 1)));
      for (let x = 0; x <= visibleWidth + stepPx; x += stepPx) {
        const worldX = visibleStartX + x;
        const centreIndex = clamp(Math.round((worldX / width) * (p.peaks.length - 1)), 0, p.peaks.length - 1);
        const radius = Math.max(1, Math.floor(smoothingWindow / 2));
        let total = 0;
        let weightTotal = 0;
        for (let offset = -radius; offset <= radius; offset += 1) {
          const index = clamp(centreIndex + offset, 0, p.peaks.length - 1);
          const weight = radius + 1 - Math.abs(offset);
          total += (p.peaks[index] || 0) * weight;
          weightTotal += weight;
        }
        const peak = weightTotal > 0 ? total / weightTotal : 0;
        const shaped = Math.min(1, Math.pow(peak, 0.72));
        points.push({ x, amp: Math.max(1.5, shaped * clipHeight * 0.48) });
      }

      const drawEdge = (top: boolean) => {
        ctx.beginPath();
        points.forEach((point, index) => {
          const y = center + (top ? -point.amp : point.amp);
          if (index === 0) ctx.moveTo(point.x, y);
          else ctx.lineTo(point.x, y);
        });
      };

      ctx.beginPath();
      points.forEach((point, index) => {
        const y = center - point.amp;
        if (index === 0) ctx.moveTo(point.x, y);
        else ctx.lineTo(point.x, y);
      });
      for (let i = points.length - 1; i >= 0; i -= 1) ctx.lineTo(points[i].x, center + points[i].amp);
      ctx.closePath();
      const waveFill = ctx.createLinearGradient(0, clipTop, 0, clipBottom);
      waveFill.addColorStop(0, 'rgba(111, 255, 198, 0.96)');
      waveFill.addColorStop(0.5, 'rgba(24, 232, 143, 0.98)');
      waveFill.addColorStop(1, 'rgba(0, 173, 105, 0.94)');
      ctx.fillStyle = waveFill;
      ctx.fill();

      ctx.strokeStyle = 'rgba(194, 255, 225, 0.78)';
      ctx.lineWidth = 1.35;
      drawEdge(true);
      ctx.stroke();
      ctx.strokeStyle = 'rgba(9, 123, 80, 0.75)';
      ctx.lineWidth = 1;
      drawEdge(false);
      ctx.stroke();
    }
  }, [p.peaks, p.duration, p.zoom, viewport, width]);

  const pointerTime = (event: PointerEvent | MouseEvent) => {
    const rect = (event.currentTarget as HTMLElement).getBoundingClientRect();
    return xToTime(event.clientX - rect.left);
  };
  const nudgeZoom = (nextZoom: number) => {
    closeContext();
    const scroller = scrollRef.current;
    const playheadX = timeToX(p.currentTime);
    const ratio = playheadX / width;
    p.onZoom(nextZoom);
    requestAnimationFrame(() => {
      if (scroller) {
        scroller.scrollLeft = Math.max(0, ratio * Math.max(MIN_TIMELINE_WIDTH, p.duration * PIXELS_PER_SECOND * nextZoom) - scroller.clientWidth / 2);
        updateViewport();
      }
    });
  };

  const rulerStep = p.zoom > 4 ? 1 : 5;

  return <div className="rounded border border-premiere-700 bg-premiere-900">
    <div className="flex items-center gap-3 border-b border-premiere-700 px-4 py-2 text-sm">
      <span className="text-slate-300">Zoom {p.zoom.toFixed(1)}x</span>
      <button onClick={() => nudgeZoom(p.zoom / 1.25)} className="rounded bg-premiere-800 px-2">−</button>
      <input type="range" min={1} max={18} step={0.1} value={p.zoom} onChange={(e) => nudgeZoom(Number(e.target.value))} className="accent-howards"/>
      <button onClick={() => nudgeZoom(p.zoom * 1.25)} className="rounded bg-premiere-800 px-2">+</button>
      <span className="ml-auto text-slate-500">Right-click timeline to add a cut. Drag markers or playhead to edit.</span>
    </div>
    <div ref={scrollRef} className="overflow-x-auto bg-[#15181e]" onScroll={() => { updateViewport(); closeContext(); }} onWheel={(e) => { closeContext(); if (Math.abs(e.deltaY) < Math.abs(e.deltaX)) return; e.preventDefault(); const scroller = scrollRef.current; if (!scroller) return; const rect = scroller.getBoundingClientRect(); const cursorX = e.clientX - rect.left + scroller.scrollLeft; const ratio = cursorX / width; const next = clamp(p.zoom * (e.deltaY < 0 ? 1.12 : 0.88), 1, 18); p.onZoom(next); requestAnimationFrame(() => { scroller.scrollLeft = ratio * Math.max(MIN_TIMELINE_WIDTH, p.duration * PIXELS_PER_SECOND * next) - (e.clientX - rect.left); updateViewport(); }); }}>
      <div className="relative h-64" style={{ width }} onContextMenu={(e) => { e.preventDefault(); setContext({ x: e.clientX, y: e.clientY, time: pointerTime(e) }); }} onPointerDown={(e) => { if ((e.target as HTMLElement).dataset.marker) return; p.onSeek(pointerTime(e)); p.onSelectCut(null); }} onPointerMove={(e) => { if (dragCut) p.onMoveCut(dragCut, pointerTime(e)); if (e.buttons === 1 && !dragCut && !(e.target as HTMLElement).dataset.marker) p.onSeek(pointerTime(e)); }} onPointerUp={() => setDragCut(null)}>
        <div className="relative border-b border-premiere-700 bg-[#111318]" style={{ height: RULER_HEIGHT }}>
          {Array.from({ length: Math.ceil(p.duration / rulerStep) + 1 }).map((_, i) => { const t = i * rulerStep; return <span key={t} className="absolute top-2 -translate-x-1/2 font-mono text-xs text-slate-500" style={{ left: timeToX(t) }}>{formatTime(t).slice(0,5)}</span>; })}
        </div>
        <canvas ref={canvasRef} className="pointer-events-none absolute" style={{ top: RULER_HEIGHT, left: viewport.scrollLeft }}/>
        <div className="absolute h-[190px] w-0.5 -translate-x-1/2 bg-red-300 shadow-[0_0_10px_rgba(252,165,165,.9)]" style={{ top: RULER_HEIGHT, left: timeToX(p.currentTime) }} />
        {p.cuts.map((cut) => <button key={cut.id} data-marker="true" title={formatTime(cut.time)} onPointerDown={(e) => { e.stopPropagation(); closeContext(); (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId); setDragCut(cut.id); p.onSelectCut(cut.id); }} onDoubleClick={() => p.onRemoveCut(cut.id)} className={`absolute h-[190px] w-1.5 -translate-x-1/2 rounded-full opacity-95 outline-none transition hover:w-2 focus:w-2 ${markerClass(cut, cut.id === p.selectedCutId)}`} style={{ top: RULER_HEIGHT, left: timeToX(cut.time) }} />)}
      </div>
    </div>
    {context && <div ref={contextRef} className="fixed z-50 rounded border border-premiere-600 bg-premiere-900 p-1 shadow-xl" style={{ left: context.x, top: context.y }}>
      <button className="block px-4 py-2 text-sm hover:bg-premiere-700" onClick={() => { p.onAddCut(context.time); closeContext(); }}>Add Cut</button>
      {selectedCut && <button className="block px-4 py-2 text-sm hover:bg-premiere-700" onClick={() => { p.onRemoveCut(selectedCut.id); closeContext(); }}>Remove Selected Cut</button>}
    </div>}
  </div>;
}
