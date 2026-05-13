from __future__ import annotations

from typing import Iterable


def export_timing_plan(cut_times: Iterable[float], audio_duration: float) -> dict:
    """Return the exact Howards/music_analyser timing JSON shape.

    The legacy analyser exports only {"timing_plan": [...]}. Its transition
    times are sorted, wrapped with the start and audio end, then converted into
    rounded clip lengths. Keep this function deliberately small so the frontend
    and backend can mirror the same export contract without extra metadata.
    """
    duration = max(0.0, float(audio_duration))
    valid_cuts = sorted({float(t) for t in cut_times if 0.0 < float(t) < duration})
    times = [0.0] + valid_cuts + [duration]
    return {
        "timing_plan": [
            {"clip_number": index + 1, "length_seconds": round(times[index + 1] - times[index], 3)}
            for index in range(len(times) - 1)
        ]
    }


def timing_plan_to_cuts(timing_plan: list[dict], audio_duration: float | None = None) -> list[float]:
    """Restore cut markers from legacy timing_plan lengths.

    The cumulative final boundary is the end of the song, so it is intentionally
    not returned as a marker.
    """
    cuts: list[float] = []
    running = 0.0
    for item in timing_plan[:-1]:
        running += float(item.get("length_seconds", 0.0))
        if audio_duration is None or running < audio_duration:
            cuts.append(round(running, 3))
    return cuts
