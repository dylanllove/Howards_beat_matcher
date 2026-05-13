from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path
import tempfile

import librosa
import numpy as np
from fastapi import UploadFile

from .waveform import generate_waveform_peaks


DEFAULT_MIN_SUGGESTED_CUT_SPACING_SECONDS = 1.25
MIN_SUGGESTED_CUT_SCORE = 0.9
CANDIDATE_MERGE_WINDOW_SECONDS = 0.1


@dataclass
class AnalysisResult:
    duration_seconds: float
    suggested_cuts: list[float]
    waveform_peaks: list[float]
    beat_times: list[float]
    beat_spacing: list[dict]
    tempo_bpm: float


def _detect_band_onsets(y: np.ndarray, sr: int, fmin: float, fmax: float, delta: float) -> np.ndarray:
    stft = np.abs(librosa.stft(y, n_fft=2048, hop_length=512))
    freqs = librosa.fft_frequencies(sr=sr, n_fft=2048)
    band = stft[(freqs >= fmin) & (freqs <= fmax)]
    if band.size == 0:
        return np.array([])
    envelope = librosa.onset.onset_strength(S=librosa.amplitude_to_db(band, ref=np.max), sr=sr, hop_length=512)
    frames = librosa.onset.onset_detect(onset_envelope=envelope, sr=sr, hop_length=512, units="frames", backtrack=False, delta=delta)
    return librosa.frames_to_time(frames, sr=sr, hop_length=512)


def _local_spacing(times: list[float], index: int) -> float:
    neighbours: list[float] = []
    if index > 0:
        neighbours.append(times[index] - times[index - 1])
    if index < len(times) - 1:
        neighbours.append(times[index + 1] - times[index])
    if not neighbours:
        return 0.5
    return float(np.median(neighbours))


def _merge_transition_candidates(candidates: list[tuple[float, float]], duration: float) -> list[tuple[float, float]]:
    candidates = sorted((t, score) for t, score in candidates if 0.15 < t < duration - 0.15)
    merged: list[tuple[float, float]] = []
    for time, score in candidates:
        if not merged or time - merged[-1][0] > CANDIDATE_MERGE_WINDOW_SECONDS:
            merged.append((time, score))
        else:
            previous_time, previous_score = merged[-1]
            combined_score = previous_score + score * 0.35
            strongest_time = time if score > previous_score else previous_time
            merged[-1] = (strongest_time, combined_score)
    return merged


def _filter_suggested_cuts(
    candidates: list[tuple[float, float]],
    min_spacing: float = DEFAULT_MIN_SUGGESTED_CUT_SPACING_SECONDS,
) -> list[float]:
    strong_candidates = [(time, score) for time, score in candidates if score >= MIN_SUGGESTED_CUT_SCORE]
    selected: list[tuple[float, float]] = []
    for time, score in sorted(strong_candidates, key=lambda item: item[1], reverse=True):
        if all(abs(time - selected_time) >= min_spacing for selected_time, _ in selected):
            selected.append((time, score))
    return [round(time, 3) for time, _ in sorted(selected)]


def analyse_audio_file(path: str | Path) -> AnalysisResult:
    y, sr = librosa.load(str(path), sr=22050, mono=True)
    duration = float(librosa.get_duration(y=y, sr=sr))

    tempo, beat_frames = librosa.beat.beat_track(y=y, sr=sr, trim=False)
    beat_times_np = librosa.frames_to_time(beat_frames, sr=sr)
    beat_times = [round(float(t), 3) for t in beat_times_np if 0.0 < float(t) < duration]

    onset_env = librosa.onset.onset_strength(y=y, sr=sr)
    onset_frames = librosa.onset.onset_detect(onset_envelope=onset_env, sr=sr, units="frames", backtrack=True, delta=0.18)
    broad_onsets = librosa.frames_to_time(onset_frames, sr=sr)
    hats = _detect_band_onsets(y, sr, 6000, 11000, 0.12)
    snares = _detect_band_onsets(y, sr, 1500, 4500, 0.14)

    candidates: list[tuple[float, float]] = []
    candidates += [(float(t), 1.0) for t in beat_times_np]
    candidates += [(float(t), 0.78) for t in broad_onsets]
    candidates += [(float(t), 0.64) for t in snares]
    candidates += [(float(t), 0.48) for t in hats]
    suggested = _filter_suggested_cuts(_merge_transition_candidates(candidates, duration))

    beat_spacing = [
        {"time": time, "spacing": round(_local_spacing(suggested, idx), 3)}
        for idx, time in enumerate(suggested)
    ]

    return AnalysisResult(
        duration_seconds=round(duration, 3),
        suggested_cuts=suggested,
        waveform_peaks=generate_waveform_peaks(y, sr),
        beat_times=beat_times,
        beat_spacing=beat_spacing,
        tempo_bpm=float(np.asarray(tempo).reshape(-1)[0]) if np.asarray(tempo).size else 0.0,
    )


async def analyse_upload(file: UploadFile) -> AnalysisResult:
    suffix = Path(file.filename or "audio.mp3").suffix or ".mp3"
    with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as tmp:
        while chunk := await file.read(1024 * 1024):
            tmp.write(chunk)
        tmp_path = Path(tmp.name)
    try:
        return analyse_audio_file(tmp_path)
    finally:
        tmp_path.unlink(missing_ok=True)
