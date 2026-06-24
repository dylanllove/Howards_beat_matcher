import type { PointerEvent } from 'react';
import { useMemo, useRef, useState } from 'react';
import type { OverlayLayer, OverlayPosition } from '../types';
import { clamp } from '../utils/time';

type Props = {
  overlays: OverlayLayer[];
  selectedOverlayId: string | null;
  currentTime: number;
  flashing: boolean;
  onSelectOverlay: (id: string | null) => void;
  onUpdateOverlay: (id: string, update: Partial<OverlayLayer> | ((overlay: OverlayLayer) => OverlayLayer)) => void;
};

const anchorTransform = (anchor: OverlayPosition['anchor']) => {
  if (anchor === 'top_left') return 'translate(0, 0)';
  if (anchor === 'top_right') return 'translate(-100%, 0)';
  if (anchor === 'bottom_left') return 'translate(0, -100%)';
  if (anchor === 'bottom_right') return 'translate(-100%, -100%)';
  return 'translate(-50%, -50%)';
};

const textAlignClass = (style: Record<string, unknown> | undefined) => {
  const align = style?.text_align;
  if (align === 'left') return 'text-left';
  if (align === 'right') return 'text-right';
  return 'text-center';
};

const isVisibleAtTime = (overlay: OverlayLayer, time: number) => time >= overlay.start_seconds && time <= overlay.end_seconds;

export default function OverlayCanvas(p: Props) {
  const canvasRef = useRef<HTMLDivElement>(null);
  const [dragOffset, setDragOffset] = useState<{ x: number; y: number } | null>(null);
  const visualOverlays = useMemo(() => p.overlays.filter((overlay) => overlay.type !== 'background_overlay' && overlay.position), [p.overlays]);
  const activeBackground = p.overlays.find((overlay) => overlay.type === 'background_overlay' && isVisibleAtTime(overlay, p.currentTime));

  const pointerPosition = (event: PointerEvent<HTMLElement>) => {
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return null;
    return {
      x: (event.clientX - rect.left) / rect.width,
      y: (event.clientY - rect.top) / rect.height,
    };
  };
  const updatePosition = (event: PointerEvent<HTMLElement>, overlay: OverlayLayer) => {
    const pointer = pointerPosition(event);
    if (!pointer || !overlay.position) return;
    p.onUpdateOverlay(overlay.id, {
      position: {
        ...overlay.position,
        x: clamp(pointer.x - (dragOffset?.x ?? 0), 0, 1),
        y: clamp(pointer.y - (dragOffset?.y ?? 0), 0, 1),
      },
    });
  };

  return <section className={`flex min-h-64 flex-1 items-center justify-center rounded border border-premiere-700 p-4 transition-colors duration-150 ${p.flashing ? 'bg-howards' : 'bg-premiere-900'}`}>
    <div
      ref={canvasRef}
      className="relative aspect-video w-full max-w-5xl overflow-hidden rounded bg-black shadow-inner"
      onPointerDown={(event) => {
        if (event.target === event.currentTarget) p.onSelectOverlay(null);
      }}
    >
      <div className="absolute inset-0 bg-[linear-gradient(135deg,rgba(255,255,255,.08)_0,rgba(255,255,255,.02)_42%,rgba(255,255,255,.05)_100%)]" />
      {activeBackground && <div className="absolute inset-0" style={{ background: String(activeBackground.style?.color ?? '#000000'), opacity: Number(activeBackground.style?.opacity ?? 0.45) }} />}
      <div className="absolute left-4 top-4 text-xs uppercase tracking-[0.28em] text-white/25">16:9 overlay layout</div>
      {visualOverlays.map((overlay) => {
        const position = overlay.position as OverlayPosition;
        const selected = overlay.id === p.selectedOverlayId;
        const active = isVisibleAtTime(overlay, p.currentTime);
        const style = overlay.style ?? {};
        const fontSize = Number(style.font_size ?? 0.04) * 100;
        const width = overlay.size?.width ? `${overlay.size.width * 100}%` : overlay.type === 'logo' ? '16%' : 'auto';
        const commonClass = `absolute cursor-move select-none rounded border px-3 py-2 shadow-lg outline-none transition ${selected ? 'border-howards ring-2 ring-howards/60' : 'border-white/20'} ${active ? 'opacity-100' : 'opacity-45'}`;

        return <button
          key={overlay.id}
          type="button"
          className={commonClass}
          style={{
            left: `${position.x * 100}%`,
            top: `${position.y * 100}%`,
            transform: anchorTransform(position.anchor),
            width,
          }}
          onPointerDown={(event) => {
            event.stopPropagation();
            p.onSelectOverlay(overlay.id);
            event.currentTarget.setPointerCapture(event.pointerId);
            const pointer = pointerPosition(event);
            setDragOffset(pointer && overlay.position ? { x: pointer.x - overlay.position.x, y: pointer.y - overlay.position.y } : null);
          }}
          onPointerMove={(event) => {
            if (event.buttons === 1 && event.currentTarget.hasPointerCapture(event.pointerId)) updatePosition(event, overlay);
          }}
          onPointerUp={() => setDragOffset(null)}
          onLostPointerCapture={() => setDragOffset(null)}
        >
          {overlay.type === 'logo' ? <div className="flex aspect-[3/1] min-w-28 items-center justify-center rounded bg-white px-3 text-sm font-bold text-premiere-950">HOWARDS</div> : <div
            className={`${textAlignClass(style)} max-w-[34rem] whitespace-pre-wrap font-semibold leading-tight text-white`}
            style={{
              color: String(style.color ?? '#FFFFFF'),
              fontSize: `${fontSize}vh`,
            }}
          >
            {overlay.text || overlay.name}
          </div>}
          {selected && <span className="absolute -right-2 -top-2 h-4 w-4 rounded-full border border-black bg-howards" />}
        </button>;
      })}
    </div>
  </section>;
}
