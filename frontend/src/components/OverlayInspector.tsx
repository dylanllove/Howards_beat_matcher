import { AlignCenter, AlignLeft, AlignRight, CirclePlus, RotateCcw, Trash2 } from 'lucide-react';
import type { OverlayAnchor, OverlayLayer, OverlayTransitionName } from '../types';
import { OVERLAY_ANCHORS, OVERLAY_TRANSITIONS } from '../utils/overlays';

type Props = {
  selectedOverlay: OverlayLayer | null;
  onAddOverlay: (type: 'text' | 'logo' | 'cta') => void;
  onDeleteSelected: () => void;
  onResetIntro: () => void;
  onUpdateOverlay: (id: string, update: Partial<OverlayLayer> | ((overlay: OverlayLayer) => OverlayLayer)) => void;
};

const numberValue = (value: unknown, fallback: number) => typeof value === 'number' && Number.isFinite(value) ? value : fallback;

export default function OverlayInspector(p: Props) {
  const overlay = p.selectedOverlay;
  const style = overlay?.style ?? {};
  const disabled = !overlay;

  const updateStyle = (key: string, value: unknown) => {
    if (!overlay) return;
    p.onUpdateOverlay(overlay.id, (layer) => ({ ...layer, style: { ...(layer.style ?? {}), [key]: value } }));
  };
  const updatePosition = (key: 'x' | 'y', value: number) => {
    if (!overlay?.position) return;
    p.onUpdateOverlay(overlay.id, { position: { x: overlay.position.x, y: overlay.position.y, anchor: overlay.position.anchor, [key]: value } });
  };
  const updateAnchor = (anchor: OverlayAnchor) => {
    if (!overlay?.position) return;
    p.onUpdateOverlay(overlay.id, { position: { x: overlay.position.x, y: overlay.position.y, anchor } });
  };

  return <aside className="flex w-full flex-col rounded border border-premiere-700 bg-premiere-900 lg:w-80">
    <div className="border-b border-premiere-700 p-3">
      <div className="grid grid-cols-2 gap-2">
        <button onClick={() => p.onAddOverlay('text')} className="flex items-center justify-center gap-2 rounded bg-premiere-800 px-2 py-2 text-sm hover:text-white"><CirclePlus size={15}/>Text</button>
        <button onClick={() => p.onAddOverlay('logo')} className="flex items-center justify-center gap-2 rounded bg-premiere-800 px-2 py-2 text-sm hover:text-white"><CirclePlus size={15}/>Logo</button>
        <button onClick={() => p.onAddOverlay('cta')} className="flex items-center justify-center gap-2 rounded bg-premiere-800 px-2 py-2 text-sm hover:text-white"><CirclePlus size={15}/>CTA</button>
        <button onClick={p.onResetIntro} className="flex items-center justify-center gap-2 rounded bg-premiere-800 px-2 py-2 text-sm hover:text-white"><RotateCcw size={15}/>Intro</button>
      </div>
    </div>
    <div className="min-h-0 flex-1 space-y-3 overflow-y-auto p-3 text-sm">
      {!overlay ? <div className="rounded border border-dashed border-premiere-600 p-4 text-slate-400">Select an overlay on the canvas or timeline.</div> : <>
        <label className="block">
          <span className="mb-1 block text-xs uppercase text-slate-500">Name</span>
          <input value={overlay.name} onChange={(event) => p.onUpdateOverlay(overlay.id, { name: event.target.value })} className="w-full rounded border border-premiere-600 bg-premiere-950 px-2 py-1.5 text-white outline-none focus:border-howards"/>
        </label>
        {(overlay.type === 'text' || overlay.type === 'cta') && <label className="block">
          <span className="mb-1 block text-xs uppercase text-slate-500">Text</span>
          <textarea value={overlay.text ?? ''} onChange={(event) => p.onUpdateOverlay(overlay.id, { text: event.target.value })} rows={3} className="w-full resize-none rounded border border-premiere-600 bg-premiere-950 px-2 py-1.5 text-white outline-none focus:border-howards"/>
        </label>}
        <div className="grid grid-cols-2 gap-2">
          <label>
            <span className="mb-1 block text-xs uppercase text-slate-500">Start</span>
            <input type="number" min={0} step={0.05} value={overlay.start_seconds} onChange={(event) => p.onUpdateOverlay(overlay.id, { start_seconds: Number(event.target.value) })} className="w-full rounded border border-premiere-600 bg-premiere-950 px-2 py-1.5 text-white outline-none focus:border-howards"/>
          </label>
          <label>
            <span className="mb-1 block text-xs uppercase text-slate-500">End</span>
            <input type="number" min={0} step={0.05} value={overlay.end_seconds} onChange={(event) => p.onUpdateOverlay(overlay.id, { end_seconds: Number(event.target.value) })} className="w-full rounded border border-premiere-600 bg-premiere-950 px-2 py-1.5 text-white outline-none focus:border-howards"/>
          </label>
        </div>
        {overlay.position && <div className="grid grid-cols-2 gap-2">
          <label>
            <span className="mb-1 block text-xs uppercase text-slate-500">X %</span>
            <input type="number" min={0} max={100} step={1} value={Math.round(overlay.position.x * 100)} onChange={(event) => updatePosition('x', Number(event.target.value) / 100)} className="w-full rounded border border-premiere-600 bg-premiere-950 px-2 py-1.5 text-white outline-none focus:border-howards"/>
          </label>
          <label>
            <span className="mb-1 block text-xs uppercase text-slate-500">Y %</span>
            <input type="number" min={0} max={100} step={1} value={Math.round(overlay.position.y * 100)} onChange={(event) => updatePosition('y', Number(event.target.value) / 100)} className="w-full rounded border border-premiere-600 bg-premiere-950 px-2 py-1.5 text-white outline-none focus:border-howards"/>
          </label>
          <label className="col-span-2">
            <span className="mb-1 block text-xs uppercase text-slate-500">Anchor</span>
            <select value={overlay.position.anchor} onChange={(event) => updateAnchor(event.target.value as OverlayAnchor)} className="w-full rounded border border-premiere-600 bg-premiere-950 px-2 py-1.5 text-white outline-none focus:border-howards">
              {OVERLAY_ANCHORS.map((anchor) => <option key={anchor} value={anchor}>{anchor.replace(/_/g, ' ')}</option>)}
            </select>
          </label>
        </div>}
        {overlay.type === 'logo' && <label className="block">
          <span className="mb-1 block text-xs uppercase text-slate-500">Logo width %</span>
          <input type="number" min={4} max={60} step={1} value={Math.round((overlay.size?.width ?? 0.16) * 100)} onChange={(event) => p.onUpdateOverlay(overlay.id, { size: { ...(overlay.size ?? {}), width: Number(event.target.value) / 100, height: 'auto' } })} className="w-full rounded border border-premiere-600 bg-premiere-950 px-2 py-1.5 text-white outline-none focus:border-howards"/>
        </label>}
        {(overlay.type === 'text' || overlay.type === 'cta') && <div className="grid grid-cols-2 gap-2">
          <label>
            <span className="mb-1 block text-xs uppercase text-slate-500">Font %</span>
            <input type="number" min={1} max={12} step={0.25} value={numberValue(style.font_size, 0.04) * 100} onChange={(event) => updateStyle('font_size', Number(event.target.value) / 100)} className="w-full rounded border border-premiere-600 bg-premiere-950 px-2 py-1.5 text-white outline-none focus:border-howards"/>
          </label>
          <label>
            <span className="mb-1 block text-xs uppercase text-slate-500">Color</span>
            <input type="color" value={String(style.color ?? '#FFFFFF')} onChange={(event) => updateStyle('color', event.target.value)} className="h-[34px] w-full rounded border border-premiere-600 bg-premiere-950 px-1"/>
          </label>
          <div className="col-span-2 flex rounded border border-premiere-600 bg-premiere-950 p-1">
            {[['left', AlignLeft], ['center', AlignCenter], ['right', AlignRight]].map(([align, Icon]) => <button key={align as string} onClick={() => updateStyle('text_align', align)} className={`flex flex-1 justify-center rounded px-2 py-1 ${style.text_align === align ? 'bg-howards text-black' : 'text-slate-300 hover:bg-premiere-800'}`} title={`${align} align`}>
              <Icon size={16}/>
            </button>)}
          </div>
        </div>}
        {overlay.type === 'background_overlay' && <div className="grid grid-cols-2 gap-2">
          <label>
            <span className="mb-1 block text-xs uppercase text-slate-500">Color</span>
            <input type="color" value={String(style.color ?? '#000000')} onChange={(event) => updateStyle('color', event.target.value)} className="h-[34px] w-full rounded border border-premiere-600 bg-premiere-950 px-1"/>
          </label>
          <label>
            <span className="mb-1 block text-xs uppercase text-slate-500">Opacity</span>
            <input type="number" min={0} max={1} step={0.05} value={numberValue(style.opacity, 0.45)} onChange={(event) => updateStyle('opacity', Number(event.target.value))} className="w-full rounded border border-premiere-600 bg-premiere-950 px-2 py-1.5 text-white outline-none focus:border-howards"/>
          </label>
        </div>}
        <div className="grid grid-cols-2 gap-2">
          <label>
            <span className="mb-1 block text-xs uppercase text-slate-500">In</span>
            <select value={overlay.transition.in} onChange={(event) => p.onUpdateOverlay(overlay.id, { transition: { ...overlay.transition, in: event.target.value as OverlayTransitionName } })} className="w-full rounded border border-premiere-600 bg-premiere-950 px-2 py-1.5 text-white outline-none focus:border-howards">
              {OVERLAY_TRANSITIONS.map((transition) => <option key={transition} value={transition}>{transition}</option>)}
            </select>
          </label>
          <label>
            <span className="mb-1 block text-xs uppercase text-slate-500">Out</span>
            <select value={overlay.transition.out} onChange={(event) => p.onUpdateOverlay(overlay.id, { transition: { ...overlay.transition, out: event.target.value as OverlayTransitionName } })} className="w-full rounded border border-premiere-600 bg-premiere-950 px-2 py-1.5 text-white outline-none focus:border-howards">
              {OVERLAY_TRANSITIONS.map((transition) => <option key={transition} value={transition}>{transition}</option>)}
            </select>
          </label>
          <label className="col-span-2">
            <span className="mb-1 block text-xs uppercase text-slate-500">Transition seconds</span>
            <input type="number" min={0} max={5} step={0.05} value={overlay.transition.duration_seconds} onChange={(event) => p.onUpdateOverlay(overlay.id, { transition: { ...overlay.transition, duration_seconds: Number(event.target.value) } })} className="w-full rounded border border-premiere-600 bg-premiere-950 px-2 py-1.5 text-white outline-none focus:border-howards"/>
          </label>
        </div>
      </>}
    </div>
    <div className="border-t border-premiere-700 p-3">
      <button disabled={disabled} onClick={p.onDeleteSelected} className="flex w-full items-center justify-center gap-2 rounded border border-red-900/70 bg-red-950/40 px-3 py-2 text-sm text-red-100 hover:bg-red-900/50 disabled:hover:bg-red-950/40"><Trash2 size={15}/>Delete Selected</button>
    </div>
  </aside>;
}
