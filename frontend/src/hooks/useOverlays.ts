import { useCallback, useState } from 'react';
import type { OverlayLayer } from '../types';
import { createCtaOverlay, createDefaultOverlays, createIntroOverlay, createLogoOverlay, createTextOverlay, sanitizeOverlay } from '../utils/overlays';

export function useOverlays(duration: number) {
  const [overlays, setOverlays] = useState<OverlayLayer[]>([]);
  const [selectedOverlayId, setSelectedOverlayId] = useState<string | null>(null);

  const resetToDefaults = useCallback((nextDuration = duration) => {
    const defaults = createDefaultOverlays(nextDuration);
    setOverlays(defaults);
    setSelectedOverlayId(defaults.find((overlay) => overlay.type !== 'background_overlay')?.id ?? null);
  }, [duration]);

  const replaceOverlays = useCallback((nextOverlays: OverlayLayer[], nextDuration = duration) => {
    const clean = nextOverlays.map((overlay) => sanitizeOverlay(overlay, nextDuration));
    setOverlays(clean);
    setSelectedOverlayId(clean.find((overlay) => overlay.type !== 'background_overlay')?.id ?? clean[0]?.id ?? null);
  }, [duration]);

  const updateOverlay = useCallback((id: string, update: Partial<OverlayLayer> | ((overlay: OverlayLayer) => OverlayLayer)) => {
    setOverlays((layers) => layers.map((layer) => {
      if (layer.id !== id) return layer;
      const next = typeof update === 'function' ? update(layer) : { ...layer, ...update };
      return sanitizeOverlay(next, duration);
    }));
  }, [duration]);

  const addOverlay = useCallback((type: 'text' | 'logo' | 'cta') => {
    const overlay = type === 'text' ? createTextOverlay(duration) : type === 'logo' ? createLogoOverlay(duration) : createCtaOverlay(duration);
    setOverlays((layers) => [...layers, overlay]);
    setSelectedOverlayId(overlay.id);
  }, [duration]);

  const deleteSelected = useCallback(() => {
    setOverlays((layers) => {
      const next = layers.filter((layer) => layer.id !== selectedOverlayId);
      setSelectedOverlayId(next.find((layer) => layer.type !== 'background_overlay')?.id ?? next[0]?.id ?? null);
      return next;
    });
  }, [selectedOverlayId]);

  const resetIntroOverlay = useCallback(() => {
    setOverlays((layers) => {
      const intro = sanitizeOverlay(createIntroOverlay(), duration);
      const exists = layers.some((layer) => layer.id === intro.id);
      return exists ? layers.map((layer) => layer.id === intro.id ? intro : layer) : [intro, ...layers];
    });
    setSelectedOverlayId('intro_black_fade');
  }, [duration]);

  return {
    overlays,
    selectedOverlayId,
    selectedOverlay: overlays.find((overlay) => overlay.id === selectedOverlayId) ?? null,
    setSelectedOverlayId,
    resetToDefaults,
    replaceOverlays,
    updateOverlay,
    addOverlay,
    deleteSelected,
    resetIntroOverlay,
  };
}
