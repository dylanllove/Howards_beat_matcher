import type { BeatSpacing, Cut } from '../types';

function nearestSpacing(suggestedTime: number, beatSpacing: BeatSpacing[], suggestedCuts: number[]): number {
  const fromBackend = beatSpacing.reduce<BeatSpacing | null>((best, item) => !best || Math.abs(item.time - suggestedTime) < Math.abs(best.time - suggestedTime) ? item : best, null);
  if (fromBackend?.spacing) return fromBackend.spacing;
  const idx = suggestedCuts.findIndex((time) => time === suggestedTime);
  const gaps = [idx > 0 ? suggestedTime - suggestedCuts[idx - 1] : 0, idx >= 0 && idx < suggestedCuts.length - 1 ? suggestedCuts[idx + 1] - suggestedTime : 0].filter(Boolean);
  return gaps.length ? Math.min(...gaps) : 0.5;
}

export function isSuggestedBeatOccupied(suggestedTime: number, existingCuts: Cut[], beatSpacing: BeatSpacing[], suggestedCuts: number[]): boolean {
  // Occupancy is based on the local beat spacing rather than a fixed seconds
  // tolerance. Fast sections produce smaller windows; slow sections produce
  // wider windows. The 22% factor is conservative: close manual edits occupy
  // the same musical beat, but neighbouring fast beats remain addable.
  const spacing = nearestSpacing(suggestedTime, beatSpacing, suggestedCuts);
  const windowSeconds = Math.min(0.18, Math.max(0.025, spacing * 0.22));
  return existingCuts.some((cut) => Math.abs(cut.time - suggestedTime) <= windowSeconds);
}
