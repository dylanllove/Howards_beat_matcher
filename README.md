# Howards Beat Matcher

A local browser-based audio timing tool for Howards property video workflows. Upload an MP3, view its waveform, place or adjust cut markers, and export a property folder containing the original MP3 and a Howards-compatible timing JSON.

The app does **not** show or edit video. It focuses on audio playback, waveform timing, manual cut editing, and exact `timing_plan` export compatibility.

## Project structure

```text
backend/   FastAPI + librosa analyser
frontend/  React + Vite + TypeScript + Tailwind editor
scripts/   convenience startup script
```

## Requirements

- Python 3.10+
- Node.js 20+
- Chrome or Edge for folder export via the File System Access API

## Backend setup

```bash
cd backend
python -m venv .venv
source .venv/bin/activate   # Windows: .venv\\Scripts\\activate
pip install -r requirements.txt
uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

## Frontend setup

In a second terminal:

```bash
cd frontend
npm install
npm run dev
```

Open `http://localhost:5173` in Chrome or Edge.

## Run both servers with the helper script

```bash
./scripts/dev.sh
```

The script creates the Python virtual environment if needed, installs backend/frontend dependencies, starts FastAPI on `127.0.0.1:8000`, and starts Vite on `localhost:5173`.

## How to use

1. Open the app in Chrome or Edge.
2. Choose **Import MP3**.
3. Leave **auto-generate suggested cuts** enabled if you want the analyser to populate initial cuts, or disable it to start with an empty timeline.
4. Use the waveform timeline to:
   - click/drag the playhead to scrub,
   - drag existing cut markers,
   - right-click the waveform and choose **Add Cut**,
   - double-click a marker or press Delete/Backspace to remove the selected cut,
   - zoom with the wheel/trackpad or visible zoom controls.
5. Optionally use **Auto Add Suggested Cuts** later. It is non-destructive: existing cuts are not moved, replaced, or deleted. Suggested cuts are only added when the local beat is not already occupied.
6. Use **Export** and enter the property/video name only at export time.
7. Choose an export location. The app creates a folder named after the property/video name.

Example export:

```text
Howard - 123 Example Street/
  Howard - 123 Example Street.mp3
  Howard - 123 Example Street.json
```

## Importing existing work

Use **Import MP3 + JSON** to reopen a previous timing plan. The JSON `timing_plan` lengths are converted back into cumulative cut positions. The final segment ending at the audio duration is not restored as a marker.

## Keyboard shortcuts

- Space: play/pause
- C: add cut at playhead
- Delete/Backspace: remove selected cut
- Left/Right: nudge selected cut
- Shift + Left/Right: larger zoom-aware nudge

## Export JSON format

The JSON intentionally contains no metadata, marker states, BPM, duration, property name, or cut list. It exports only the shape expected by the existing Howards/music analyser workflow:

```json
{
  "timing_plan": [
    { "clip_number": 1, "length_seconds": 1.486 },
    { "clip_number": 2, "length_seconds": 0.975 }
  ]
}
```

Cut times are sorted chronologically before export. The export logic is:

```python
times = [0.0] + sorted(cut_times) + [audio_duration]
length_seconds = round(next_time - current_time, 3)
```

`clip_number` starts at 1 and follows chronological timing order.
