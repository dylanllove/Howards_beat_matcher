from __future__ import annotations

from fastapi import FastAPI, File, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from .analyser import analyse_upload
from .timing import export_timing_plan

app = FastAPI(title="Howards Beat Matcher API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class TimingPlanRequest(BaseModel):
    cut_times: list[float]
    duration_seconds: float


@app.get("/health")
def health() -> dict:
    return {"status": "ok"}


@app.post("/analyse")
async def analyse(file: UploadFile = File(...)) -> dict:
    if not (file.filename or "").lower().endswith(".mp3"):
        raise HTTPException(status_code=400, detail="Please upload an MP3 file.")
    result = await analyse_upload(file)
    return {
        "duration_seconds": result.duration_seconds,
        "suggested_cuts": result.suggested_cuts,
        "waveform_peaks": result.waveform_peaks,
        "beat_times": result.beat_times,
        "beat_spacing": result.beat_spacing,
        "tempo_bpm": round(result.tempo_bpm, 2),
    }


@app.post("/timing-plan")
def timing_plan(payload: TimingPlanRequest) -> dict:
    return export_timing_plan(payload.cut_times, payload.duration_seconds)
