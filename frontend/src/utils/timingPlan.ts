import type { TimingPlan } from '../types';

export function exportTimingPlan(cutTimes: number[], duration: number): TimingPlan {
  // Keep this identical to the Python analyser contract: sort cuts, wrap with
  // [0.0] and [audio_duration], convert each gap into a rounded length, and
  // output no fields except the timing_plan array expected by Howards renderers.
  const validCuts = [...new Set(cutTimes.filter((t) => t > 0 && t < duration).map((t) => Number(t)))].sort((a, b) => a - b);
  const times = [0, ...validCuts, duration];
  return { timing_plan: times.slice(0, -1).map((time, index) => ({ clip_number: index + 1, length_seconds: Math.round((times[index + 1] - time) * 1000) / 1000 })) };
}

export function cutsFromTimingPlan(plan: TimingPlan, duration?: number): number[] {
  let running = 0;
  return plan.timing_plan.slice(0, -1).map((item) => {
    running += Number(item.length_seconds) || 0;
    return Math.round(running * 1000) / 1000;
  }).filter((time) => duration === undefined || time < duration);
}
