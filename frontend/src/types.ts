export type CutState = 'suggested' | 'adjusted' | 'manual' | 'imported';
export type Cut = { id: string; time: number; state: CutState };
export type BeatSpacing = { time: number; spacing: number };
export type AnalysisResult = { duration_seconds: number; suggested_cuts: number[]; waveform_peaks: number[]; beat_times: number[]; beat_spacing: BeatSpacing[]; tempo_bpm: number };
export type TimingPlan = { timing_plan: { clip_number: number; length_seconds: number }[] };
