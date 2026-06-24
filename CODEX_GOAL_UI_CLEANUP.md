# Codex Goal: Overlay Editor UI Cleanup

## Context

Howards Beat Matcher now has overlay planning, but the new UI is too cluttered. This goal is a focused frontend cleanup so the app feels clean and easy to use again.

## Scope

Make a UI refinement only. Do not rebuild the app.

Do not change:
- backend logic
- analyser behavior
- cut timing logic
- existing timing JSON export
- overlay JSON schema unless absolutely needed
- manual cut behavior

The existing timing export file must stay unchanged and continue to output only:

```json
{
  "timing_plan": [
    { "clip_number": 1, "length_seconds": 1.486 }
  ]
}
```

Overlay data must remain in the companion file:

```text
<Property Name>.overlays.json
```

## Problem

The overlay feature works, but the UI feels messy:
- overlay canvas feels too large and visually covers other areas
- overlay text can bleed into the timeline
- inspector controls are cramped
- overlay lane is too dominant
- waveform area feels crowded
- beat matching is no longer the obvious main workflow

## Required UX change

Add two clear modes:

```ts
activeMode: "beat" | "overlay"
```

Add toolbar tabs/buttons:
- Beat Match
- Overlay Editor

### Beat Match mode

This is the default mode.

Show:
- clean preview panel
- waveform timeline
- cut markers
- playback controls
- export controls

Hide:
- overlay inspector
- overlay timing lane
- overlay placeholders/text

Beat Match mode should feel close to the app before overlays were added.

### Overlay Editor mode

Show:
- contained 16:9 overlay canvas inside the preview panel
- text/logo/CTA placeholders inside that canvas only
- clean inspector panel
- compact overlay timing lane
- waveform timeline remains visible and readable

## Preview panel requirements

- Use a centered 16:9 frame inside the preview panel.
- The overlay canvas must stay inside the preview panel.
- Clip overflowing overlay content with `overflow: hidden`.
- Overlay elements must not render outside the 16:9 frame.
- Keep preview height reasonable so the timeline remains usable.

## Timeline requirements

- Waveform remains clean and readable.
- Cut markers remain high contrast.
- Overlay lane appears only in Overlay Editor mode.
- Overlay lane must be compact and separate from the waveform.
- Overlay lane must not cover waveform bars or cut markers.
- Overlay block labels should be small and clipped with ellipsis.
- Do not add cut marker labels.
- Do not add a cut list/table.
- Do not add analyser beat guide lines.

## Inspector requirements

Make the inspector tidy and contained.

Use clear groups:
- Overlay actions: Add Text, Add Logo, Add CTA, Reset Intro, Delete Selected
- Selected overlay settings: Name, Text, Start, End, Transition, Position, Size/Scale, Opacity

If no overlay is selected, show:

```text
Select an overlay to edit.
```

The inspector must not cover the preview or timeline. On narrower screens, stack it below the preview.

## Suggested layout

Beat Match mode:

```text
Top toolbar
Stats row
Preview panel
Waveform timeline
Playback controls
```

Overlay Editor mode:

```text
Top toolbar
Stats row
Preview panel + inspector on wide screens
Compact overlay timing lane
Waveform timeline
Playback controls
```

## Preserve existing behavior

Keep working:
- MP3 import
- suggested cuts
- manual cuts
- waveform rendering
- zoom and scroll
- playback
- preview flash
- timing JSON export
- overlay JSON export
- overlay dragging
- overlay timing edits
- optional overlays JSON import

## Acceptance checklist

- App opens cleanly.
- Beat Match mode is clean and uncluttered.
- Overlay Editor mode is available but secondary.
- Nothing overlaps the timeline.
- Overlay text stays inside the preview canvas.
- Inspector does not cover preview or timeline.
- Overlay lane does not cover waveform.
- Export still creates the MP3, timing JSON, and overlays JSON.
- Existing timing JSON format remains unchanged.

## Testing

Run:
- `git diff --check`
- `npm run build`
- backend checks only if backend files are touched

Smoke test:
- import MP3
- switch between modes
- drag overlay in preview
- edit overlay timing
- zoom timeline
- export folder

## Summary required

When done, summarize:
- changed files
- UI layout changes
- confirmation that timing JSON stayed unchanged
- tests run
- limitations or TODOs
