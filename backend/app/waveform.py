from __future__ import annotations

import numpy as np


def generate_waveform_peaks(y: np.ndarray, sample_rate: int, target_peaks: int = 5000) -> list[float]:
    """Downsample decoded audio into normalized peak amplitudes for canvas drawing.

    The frontend needs a compact visual envelope rather than every sample. We
    split the mono waveform into buckets and keep the max absolute amplitude in
    each bucket, then normalize so the tallest peak is 1.0. This keeps long MP3s
    performant while preserving obvious beat/transient shapes on the timeline.
    """
    if y.size == 0:
        return []

    total_samples = int(y.shape[0])
    bucket_count = max(1, min(target_peaks, total_samples))
    bucket_size = int(np.ceil(total_samples / bucket_count))
    padded_length = bucket_count * bucket_size
    padded = np.pad(y, (0, padded_length - total_samples), mode="constant")
    buckets = padded.reshape(bucket_count, bucket_size)
    peaks = np.max(np.abs(buckets), axis=1)
    max_peak = float(np.max(peaks)) or 1.0
    normalized = np.clip(peaks / max_peak, 0.0, 1.0)
    return [round(float(value), 4) for value in normalized]
