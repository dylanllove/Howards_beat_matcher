import { useCallback, useState } from 'react';
import { clamp } from '../utils/time';
export function useTimelineZoom() {
  const [zoom, setZoomState] = useState(1);
  const setZoom = useCallback((next: number) => setZoomState(clamp(next, 1, 18)), []);
  return { zoom, setZoom, zoomIn: () => setZoom(zoom * 1.25), zoomOut: () => setZoom(zoom / 1.25) };
}
