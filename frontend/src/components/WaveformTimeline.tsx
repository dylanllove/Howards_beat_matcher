import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { MouseEvent, PointerEvent } from 'react';
import type { Cut } from '../types';
import { clamp, formatTime } from '../utils/time';

type Props = { peaks: number[]; duration: number; cuts: Cut[]; selectedCutId: string | null; currentTime: number; isPlaying: boolean; zoom: number; onZoom: (z: number) => void; onSeek: (time: number) => void; onAddCut: (time: number) => void; onMoveCut: (id: string, time: number) => void; onSelectCut: (id: string | null) => void; onRemoveCut: (id: string | null) => void };
const markerClass = (cut: Cut, selected: boolean) => selected ? 'bg-howards shadow-[0_0_14px_rgba(0,168,107,.8)] ring-1 ring-emerald-200' : cut.state === 'suggested' ? 'bg-slate-300/90' : cut.state === 'manual' ? 'bg-white' : cut.state === 'adjusted' ? 'bg-howards' : 'bg-emerald-200';

export default function WaveformTimeline(p: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const contextRef = useRef<HTMLDivElement>(null);
  const [dragCut, setDragCut] = useState<string | null>(null);
  const [context, setContext] = useState<{ x: number; y: number; time: number } | null>(null);
  const width = Math.max(900, p.duration * 80 * p.zoom);
  const timeToX = (time: number) => (time / Math.max(p.duration, 0.001)) * width;
  const xToTime = (x: number) => clamp((x / width) * p.duration, 0, p.duration);
  const selectedCut = useMemo(() => p.cuts.find((c) => c.id === p.selectedCutId), [p.cuts, p.selectedCutId]);
  const closeContext = useCallback(() => setContext(null), []);

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
    const dpr = window.devicePixelRatio || 1;
    const h = 190;
    const center = h / 2;
    canvas.width = width * dpr;
    canvas.height = h * dpr;
    canvas.style.width = `${width}px`;
    canvas.style.height = `${h}px`;
    const ctx = canvas.getContext('2d')!;
    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, width, h);

    const background = ctx.createLinearGradient(0, 0, 0, h);
    background.addColorStop(0, '#171a20');
    background.addColorStop(1, '#111318');
    ctx.fillStyle = background;
    ctx.fillRect(0, 0, width, h);

    const gridStep = p.zoom > 8 ? 0.25 : p.zoom > 4 ? 0.5 : p.zoom > 2 ? 1 : 5;
    for (let t = 0; t <= p.duration; t += gridStep) {
      const x = timeToX(t);
      const major = Math.abs(t - Math.round(t)) < 0.001;
      ctx.strokeStyle = major ? 'rgba(148, 163, 184, 0.16)' : 'rgba(148, 163, 184, 0.07)';
      ctx.lineWidth = major ? 1 : 0.75;
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, h);
      ctx.stroke();
    }

    ctx.strokeStyle = 'rgba(226, 232, 240, 0.16)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, center);
    ctx.lineTo(width, center);
    ctx.stroke();

    const sampleCount = Math.max(1, Math.min(p.peaks.length, Math.ceil(width / 2)));
    const samplesPerPixel = Math.max(1, p.peaks.length / sampleCount);
    const top: number[] = [];
    const bottom: number[] = [];
    for (let i = 0; i < sampleCount; i += 1) {
      const start = Math.floor(i * samplesPerPixel);
      const end = Math.min(p.peaks.length, Math.ceil((i + 1) * samplesPerPixel));
      let peak = 0;
      for (let j = start; j < end; j += 1) peak = Math.max(peak, p.peaks[j] || 0);
      const smoothed = Math.min(1, Math.pow(peak, 0.78));
      const amp = Math.max(2, smoothed * (h * 0.43));
      const x = (i / Math.max(1, sampleCount - 1)) * width;
      top.push(x, center - amp);
      bottom.push(x, center + amp);
    }

    const waveFill = ctx.createLinearGradient(0, 18, 0, h - 18);
    waveFill.addColorStop(0, 'rgba(60, 230, 169, 0.88)');
    waveFill.addColorStop(0.5, 'rgba(0, 168, 107, 0.96)');
    waveFill.addColorStop(1, 'rgba(0, 108, 75, 0.92)');
    ctx.beginPath();
    for (let i = 0; i < top.length; i += 2) {
      const x = top[i];
      const y = top[i + 1];
      if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    }
    for (let i = bottom.length - 2; i >= 0; i -= 2) ctx.lineTo(bottom[i], bottom[i + 1]);
    ctx.closePath();
    ctx.fillStyle = waveFill;
    ctx.fill();

    ctx.strokeStyle = 'rgba(178, 255, 222, 0.72)';
    ctx.lineWidth = 1.25;
    ctx.beginPath();
    for (let i = 0; i < top.length; i += 2) {
      const x = top[i];
      const y = top[i + 1];
      if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    }
    ctx.stroke();
    ctx.beginPath();
    for (let i = 0; i < bottom.length; i += 2) {
      const x = bottom[i];
      const y = bottom[i + 1];
      if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    }
    ctx.stroke();
  }, [p.peaks, p.duration, p.zoom, width]);

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
    requestAnimationFrame(() => { if (scroller) scroller.scrollLeft = Math.max(0, ratio * Math.max(900, p.duration * 80 * nextZoom) - scroller.clientWidth / 2); });
  };

  return <div className="rounded border border-premiere-700 bg-premiere-900">
    <div className="flex items-center gap-3 border-b border-premiere-700 px-4 py-2 text-sm">
      <span className="text-slate-300">Zoom {p.zoom.toFixed(1)}x</span>
      <button onClick={() => nudgeZoom(p.zoom / 1.25)} className="rounded bg-premiere-800 px-2">−</button>
      <input type="range" min={1} max={18} step={0.1} value={p.zoom} onChange={(e) => nudgeZoom(Number(e.target.value))} className="accent-howards"/>
      <button onClick={() => nudgeZoom(p.zoom * 1.25)} className="rounded bg-premiere-800 px-2">+</button>
      <span className="ml-auto text-slate-500">Right-click timeline to add a cut. Drag markers or playhead to edit.</span>
    </div>
    <div ref={scrollRef} className="overflow-x-auto" onScroll={closeContext} onWheel={(e) => { closeContext(); if (Math.abs(e.deltaY) < Math.abs(e.deltaX)) return; e.preventDefault(); const scroller = scrollRef.current; if (!scroller) return; const rect = scroller.getBoundingClientRect(); const cursorX = e.clientX - rect.left + scroller.scrollLeft; const ratio = cursorX / width; const next = clamp(p.zoom * (e.deltaY < 0 ? 1.12 : 0.88), 1, 18); p.onZoom(next); requestAnimationFrame(() => { scroller.scrollLeft = ratio * Math.max(900, p.duration * 80 * next) - (e.clientX - rect.left); }); }}>
      <div className="relative h-64" style={{ width }} onContextMenu={(e) => { e.preventDefault(); setContext({ x: e.clientX, y: e.clientY, time: pointerTime(e) }); }} onPointerDown={(e) => { if ((e.target as HTMLElement).dataset.marker) return; p.onSeek(pointerTime(e)); p.onSelectCut(null); }} onPointerMove={(e) => { if (dragCut) p.onMoveCut(dragCut, pointerTime(e)); if (e.buttons === 1 && !dragCut && !(e.target as HTMLElement).dataset.marker) p.onSeek(pointerTime(e)); }} onPointerUp={() => setDragCut(null)}>
        <div className="relative h-12 border-b border-premiere-700 bg-premiere-950">
          {Array.from({ length: Math.ceil(p.duration / (p.zoom > 4 ? 1 : 5)) + 1 }).map((_, i) => { const step = p.zoom > 4 ? 1 : 5; const t = i * step; return <span key={t} className="absolute top-2 -translate-x-1/2 font-mono text-xs text-slate-500" style={{ left: timeToX(t) }}>{formatTime(t).slice(0,5)}</span>; })}
        </div>
        <canvas ref={canvasRef} className="absolute top-12"/>
        <div className="absolute top-12 h-[190px] w-0.5 -translate-x-1/2 bg-red-400 shadow-[0_0_10px_rgba(248,113,113,.85)]" style={{ left: timeToX(p.currentTime) }} />
        {p.cuts.map((cut) => <button key={cut.id} data-marker="true" title={formatTime(cut.time)} onPointerDown={(e) => { e.stopPropagation(); closeContext(); (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId); setDragCut(cut.id); p.onSelectCut(cut.id); }} onDoubleClick={() => p.onRemoveCut(cut.id)} className={`absolute top-12 h-[190px] w-1.5 -translate-x-1/2 rounded-full opacity-95 outline-none transition hover:w-2 focus:w-2 ${markerClass(cut, cut.id === p.selectedCutId)}`} style={{ left: timeToX(cut.time) }} />)}
      </div>
    </div>
    {context && <div ref={contextRef} className="fixed z-50 rounded border border-premiere-600 bg-premiere-900 p-1 shadow-xl" style={{ left: context.x, top: context.y }}>
      <button className="block px-4 py-2 text-sm hover:bg-premiere-700" onClick={() => { p.onAddCut(context.time); closeContext(); }}>Add Cut</button>
      {selectedCut && <button className="block px-4 py-2 text-sm hover:bg-premiere-700" onClick={() => { p.onRemoveCut(selectedCut.id); closeContext(); }}>Remove Selected Cut</button>}
    </div>}
  </div>;
}
