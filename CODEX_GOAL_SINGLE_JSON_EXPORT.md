# Codex Goal: Export One Combined JSON File

## Context

Howards Beat Matcher currently exports three files:

```text
<Property Name>.mp3
<Property Name>.json
<Property Name>.overlays.json
```

The UI is now usable enough. Do not keep redesigning the UI unless required for this export change.

The issue is export format: we now want only **one JSON file**, not separate timing and overlay JSON files.

## Goal

Change export so the folder contains only:

```text
<Property Name>.mp3
<Property Name>.json
```

The single JSON file should contain both:
- the existing `timing_plan`
- the overlay/text/logo/CTA config

Do not export `<Property Name>.overlays.json` anymore.

## Important compatibility rule

Keep `timing_plan` exactly as it currently works.

Do not rename it.
Do not change the clip timing calculation.
Do not change the ordering.
Do not change rounding.
Do not change `clip_number` or `length_seconds`.

The first top-level key should still be `timing_plan`.

## New combined JSON shape

Export `<Property Name>.json` like this:

```json
{
  "timing_plan": [
    { "clip_number": 1, "length_seconds": 2.8 },
    { "clip_number": 2, "length_seconds": 3.8 }
  ],
  "overlays": {
    "version": 1,
    "canvas": {
      "aspect_ratio": "16:9",
      "width": 1920,
      "height": 1080,
      "coordinate_system": "normalized"
    },
    "audio": {
      "duration_seconds": 91.162
    },
    "items": [
      {
        "id": "intro_black_fade",
        "type": "background_overlay",
        "name": "Intro Black Fade",
        "start_seconds": 0,
        "end_seconds": 1.2,
        "style": {
          "color": "#000000",
          "opacity": 0.45
        },
        "transition": {
          "in": "none",
          "out": "fade",
          "duration_seconds": 1.2
        }
      }
    ]
  }
}
```

## Notes on overlay shape

The previous `.overlays.json` file had this shape:

```json
{
  "version": 1,
  "canvas": { ... },
  "audio": { ... },
  "overlays": [ ... ]
}
```

In the combined file, avoid a confusing duplicate key like `overlays.overlays`.

Use:

```json
"overlays": {
  "version": 1,
  "canvas": { ... },
  "audio": { ... },
  "items": [ ... ]
}
```

So the overlay list becomes `overlays.items`.

## Export behavior

Update the export modal/helpers so export writes:

```text
<Property Name>.mp3
<Property Name>.json
```

Only two files.

Remove the separate overlays file write.

Update any UI text that says it exports three files.

## Import behavior

Update import/reopen behavior to support the new combined JSON file.

When importing MP3 + JSON:
- read `timing_plan` from the top-level `timing_plan`
- if `overlays.items` exists, restore overlay items from there
- if no overlays are present, create default overlays from audio duration

For backwards compatibility, optionally still support the old separate `.overlays.json` import if it already exists in the UI and is easy to keep, but do not export that file anymore.

Also support older timing-only JSON files:

```json
{
  "timing_plan": [ ... ]
}
```

If a JSON has only `timing_plan`, import cuts as before and generate default overlays.

## Files likely affected

Likely files:
- `frontend/src/utils/exportFiles.ts`
- `frontend/src/utils/overlays.ts`
- `frontend/src/App.tsx`
- `frontend/src/components/ExportModal.tsx`
- `frontend/src/types.ts`

Only change what is needed.

## Do not change

Do not change:
- backend code
- waveform rendering
- beat/cut editor behavior
- overlay editor layout unless necessary
- analyser behavior
- manual cut freedom

## Testing checklist

Verify:

1. App imports MP3.
2. Beat matching still works.
3. Overlay editor still works.
4. Export folder contains only two files:
   - `<Property Name>.mp3`
   - `<Property Name>.json`
5. Combined JSON has top-level `timing_plan`.
6. Combined JSON has top-level `overlays` object.
7. Overlay list is at `overlays.items`.
8. No `.overlays.json` file is exported.
9. Importing combined MP3 + JSON restores cuts and overlays.
10. Importing old timing-only JSON still restores cuts and creates default overlays.

Run:
- `git diff --check`
- `npm run build`

## Summary required

When done, summarize:
- changed files
- exact export file list
- final JSON shape
- import compatibility
- tests run
