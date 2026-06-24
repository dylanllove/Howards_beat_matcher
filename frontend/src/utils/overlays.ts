import type { OverlayAnchor, OverlayConfig, OverlayLayer, OverlayTransitionName } from '../types';
import { clamp, makeId } from './time';

export const OVERLAY_TRANSITIONS: OverlayTransitionName[] = ['none', 'fade', 'slide_up_fade', 'slide_left_fade', 'typewriter'];
export const OVERLAY_ANCHORS: OverlayAnchor[] = ['top_left', 'top_right', 'bottom_left', 'bottom_right', 'center'];

const CANVAS_CONFIG = {
  aspect_ratio: '16:9',
  width: 1920,
  height: 1080,
  coordinate_system: 'normalized',
} as const;

const round = (value: number, digits = 3) => Math.round(value * 10 ** digits) / 10 ** digits;

export function createIntroOverlay(): OverlayLayer {
  return {
    id: 'intro_black_fade',
    type: 'background_overlay',
    name: 'Intro Black Fade',
    start_seconds: 0,
    end_seconds: 1.2,
    style: {
      color: '#000000',
      opacity: 0.45,
    },
    transition: {
      in: 'none',
      out: 'fade',
      duration_seconds: 1.2,
    },
  };
}

export function createDefaultOverlays(durationSeconds: number): OverlayLayer[] {
  const duration = Math.max(0, durationSeconds || 0);
  const introEnd = duration > 0 ? Math.min(1.2, duration) : 1.2;
  const earlyEnd = duration > 0 ? Math.min(3.5, duration) : 3.5;
  const ctaStart = Math.max(duration - 4, 0);

  return [
    { ...createIntroOverlay(), end_seconds: introEnd },
    {
      id: 'logo_1',
      type: 'logo',
      name: 'Howards Logo',
      asset: {
        kind: 'placeholder',
        ref: 'howards_logo',
      },
      start_seconds: Math.min(0.2, duration),
      end_seconds: earlyEnd,
      position: {
        x: 0.08,
        y: 0.08,
        anchor: 'top_left',
      },
      size: {
        width: 0.16,
        height: 'auto',
      },
      style: {
        opacity: 1,
      },
      transition: {
        in: 'fade',
        out: 'fade',
        duration_seconds: 0.35,
      },
    },
    {
      id: 'title_1',
      type: 'text',
      name: 'Property Title',
      text: 'Property Title',
      start_seconds: Math.min(0.35, duration),
      end_seconds: earlyEnd,
      position: {
        x: 0.08,
        y: 0.78,
        anchor: 'bottom_left',
      },
      style: {
        font_family: 'Inter',
        font_weight: 600,
        // Normalized against canvas height for renderer independence.
        font_size: 0.045,
        color: '#FFFFFF',
        opacity: 1,
        letter_spacing: 0,
        text_align: 'left',
      },
      transition: {
        in: 'slide_up_fade',
        out: 'fade',
        duration_seconds: 0.45,
      },
    },
    {
      id: 'cta_1',
      type: 'cta',
      name: 'End CTA',
      text: 'Book your AI listing video with Howards',
      start_seconds: ctaStart,
      end_seconds: duration,
      position: {
        x: 0.5,
        y: 0.72,
        anchor: 'center',
      },
      style: {
        font_family: 'Inter',
        font_weight: 600,
        font_size: 0.04,
        color: '#FFFFFF',
        background_color: '#0B7A3B',
        background_opacity: 0.92,
        padding_x: 0.025,
        padding_y: 0.014,
        border_radius: 0.018,
        text_align: 'center',
      },
      transition: {
        in: 'fade',
        out: 'fade',
        duration_seconds: 0.4,
      },
    },
  ];
}

export function createTextOverlay(duration: number): OverlayLayer {
  const start = 0;
  const end = duration > 0 ? Math.min(duration, 3) : 3;
  return {
    id: `text_${makeId()}`,
    type: 'text',
    name: 'Text Overlay',
    text: 'Text Overlay',
    start_seconds: start,
    end_seconds: end,
    position: { x: 0.5, y: 0.5, anchor: 'center' },
    style: {
      font_family: 'Inter',
      font_weight: 600,
      font_size: 0.04,
      color: '#FFFFFF',
      opacity: 1,
      letter_spacing: 0,
      text_align: 'center',
    },
    transition: { in: 'fade', out: 'fade', duration_seconds: 0.4 },
  };
}

export function createLogoOverlay(duration: number): OverlayLayer {
  return {
    id: `logo_${makeId()}`,
    type: 'logo',
    name: 'Howards Logo',
    asset: { kind: 'placeholder', ref: 'howards_logo' },
    start_seconds: 0,
    end_seconds: duration > 0 ? Math.min(duration, 3.5) : 3.5,
    position: { x: 0.08, y: 0.08, anchor: 'top_left' },
    size: { width: 0.16, height: 'auto' },
    style: { opacity: 1 },
    transition: { in: 'fade', out: 'fade', duration_seconds: 0.35 },
  };
}

export function createCtaOverlay(duration: number): OverlayLayer {
  return {
    id: `cta_${makeId()}`,
    type: 'cta',
    name: 'End CTA',
    text: 'Book your AI listing video with Howards',
    start_seconds: Math.max(duration - 4, 0),
    end_seconds: Math.max(duration, 4),
    position: { x: 0.5, y: 0.72, anchor: 'center' },
    style: {
      font_family: 'Inter',
      font_weight: 600,
      font_size: 0.04,
      color: '#FFFFFF',
      background_color: '#0B7A3B',
      background_opacity: 0.92,
      padding_x: 0.025,
      padding_y: 0.014,
      border_radius: 0.018,
      text_align: 'center',
    },
    transition: { in: 'fade', out: 'fade', duration_seconds: 0.4 },
  };
}

export function sanitizeOverlay(layer: OverlayLayer, durationSeconds: number): OverlayLayer {
  const duration = Math.max(0, durationSeconds || 0);
  const start = clamp(Number(layer.start_seconds) || 0, 0, duration);
  const rawEnd = Number(layer.end_seconds) || start;
  const end = clamp(Math.max(rawEnd, start + 0.1), 0, duration || Math.max(rawEnd, start + 0.1));
  const transitionIn = OVERLAY_TRANSITIONS.includes(layer.transition.in) ? layer.transition.in : 'fade';
  const transitionOut = OVERLAY_TRANSITIONS.includes(layer.transition.out) ? layer.transition.out : 'fade';

  return {
    ...layer,
    name: layer.name || layer.type,
    start_seconds: round(start),
    end_seconds: round(Math.max(end, start)),
    position: layer.position ? {
      x: round(clamp(Number(layer.position.x) || 0, 0, 1)),
      y: round(clamp(Number(layer.position.y) || 0, 0, 1)),
      anchor: OVERLAY_ANCHORS.includes(layer.position.anchor) ? layer.position.anchor : 'center',
    } : undefined,
    size: layer.size ? {
      ...layer.size,
      width: layer.size.width === undefined ? undefined : round(clamp(Number(layer.size.width) || 0, 0.02, 1)),
    } : undefined,
    transition: {
      in: transitionIn,
      out: transitionOut,
      duration_seconds: round(clamp(Number(layer.transition.duration_seconds) || 0, 0, 5)),
    },
  };
}

export function serializeOverlayConfig(overlays: OverlayLayer[], durationSeconds: number): OverlayConfig {
  return {
    version: 1,
    canvas: CANVAS_CONFIG,
    audio: {
      duration_seconds: round(Math.max(0, durationSeconds || 0)),
    },
    overlays: overlays.map((overlay) => sanitizeOverlay(overlay, durationSeconds)),
  };
}

export function parseOverlayConfig(value: unknown, durationSeconds: number): OverlayLayer[] {
  if (!value || typeof value !== 'object' || !Array.isArray((value as { overlays?: unknown }).overlays)) return createDefaultOverlays(durationSeconds);
  return (value as { overlays: OverlayLayer[] }).overlays.map((overlay) => sanitizeOverlay(overlay, durationSeconds));
}
