# Howards Beat Matcher Backend

FastAPI service for MP3 analysis and Howards-compatible timing plan generation.

## Setup

```bash
cd backend
python -m venv .venv
source .venv/bin/activate   # Windows: .venv\\Scripts\\activate
pip install -r requirements.txt
```

## Run

```bash
uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

## Endpoints

- `GET /health` — confirms the API is running.
- `POST /analyse` — upload an MP3 as form field `file`; returns duration, suggested cuts, waveform peaks, beat times, local beat spacing, and tempo.
- `POST /timing-plan` — accepts `cut_times` and `duration_seconds`, and returns only the legacy `{ "timing_plan": [...] }` shape.

The analyser uses `librosa` to load the MP3, detect beats and onset transients, inspect hi-hat/snare/clap-like frequency bands, and merge them into suggested transition candidates.
