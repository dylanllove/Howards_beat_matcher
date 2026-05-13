export function formatTime(seconds: number): string {
  const safe = Math.max(0, seconds || 0);
  const minutes = Math.floor(safe / 60);
  const secs = Math.floor(safe % 60);
  const millis = Math.round((safe - Math.floor(safe)) * 1000);
  return `${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}.${String(millis).padStart(3, '0')}`;
}

export function clamp(value: number, min: number, max: number): number { return Math.min(max, Math.max(min, value)); }
export const makeId = () => crypto.randomUUID?.() ?? `${Date.now()}-${Math.random()}`;
