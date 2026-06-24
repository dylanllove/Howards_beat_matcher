export type CutState = 'suggested' | 'adjusted' | 'manual' | 'imported';
export type Cut = { id: string; time: number; state: CutState };
export type BeatSpacing = { time: number; spacing: number };
export type AnalysisResult = { duration_seconds: number; suggested_cuts: number[]; waveform_peaks: number[]; beat_times: number[]; beat_spacing: BeatSpacing[]; tempo_bpm: number };
export type TimingPlan = { timing_plan: { clip_number: number; length_seconds: number }[] };

export type OverlayType = 'text' | 'logo' | 'cta' | 'background_overlay';
export type OverlayTransitionName = 'none' | 'fade' | 'slide_up_fade' | 'slide_left_fade' | 'typewriter';
export type OverlayAnchor = 'top_left' | 'top_right' | 'bottom_left' | 'bottom_right' | 'center';

export type OverlayPosition = {
  x: number;
  y: number;
  anchor: OverlayAnchor;
};

export type OverlaySize = {
  width?: number;
  height?: number | 'auto';
};

export type OverlayTransition = {
  in: OverlayTransitionName;
  out: OverlayTransitionName;
  duration_seconds: number;
};

export interface OverlayLayer {
  id: string;
  type: OverlayType;
  name: string;
  start_seconds: number;
  end_seconds: number;
  position?: OverlayPosition;
  size?: OverlaySize;
  text?: string;
  asset?: {
    kind: 'placeholder';
    ref: string;
  };
  style?: Record<string, unknown>;
  transition: OverlayTransition;
}

export type OverlayConfig = {
  version: 1;
  canvas: {
    aspect_ratio: '16:9';
    width: 1920;
    height: 1080;
    coordinate_system: 'normalized';
  };
  audio: {
    duration_seconds: number;
  };
  overlays: OverlayLayer[];
};
