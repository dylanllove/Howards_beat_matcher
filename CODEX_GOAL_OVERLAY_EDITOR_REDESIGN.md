# Codex Goal: Redesign Overlay Editor UI

## Context

Howards Beat Matcher is working for beat matching, and the overlay editor feature has been added. The issue now is that the Overlay Editor UI is still bad: it technically exists, but it is not clean, not intuitive, and not easy to use.

This goal is a focused UI/UX redesign of the Overlay Editor mode only.

## Core principle

The Overlay Editor must feel like a simple, clean layout tool, not a cluttered timeline hack.

It should be easy to understand in 5 seconds:
- preview canvas in the middle/left
- selected overlay settings on the right
- overlay timing controls below or inside the inspector
- audio timeline remains readable and secondary while editing overlays

## Do not change

Do not change:
- backend logic
- analyser behavior
- existing cut timing behavior
- manual cut editing
- existing timing JSON format
- overlay JSON schema unless absolutely necessary
- export file names

The existing timing JSON must still output only:

```json
{
  "timing_plan": [
    { "clip_number": 1, "length_seconds": 1.486 }
  ]
}
```

Overlay data must stay in:

```text
<Property Name>.overlays.json
```

## Current UI problems

The current Overlay Editor still feels bad:
- overlay canvas is too small/awkward inside a large empty preview area
- overlay controls are cramped and unclear
- overlay timing lane is visually messy
- overlay text appears behind or near the timeline in a confusing way
- there is no clean mental model for editing text/layout/timing
- it feels like a chore to use

## Desired Overlay Editor layout

When `Overlay Editor` mode is active, use this layout:

```text
Top toolbar
Stats row

Overlay workspace:
  Left/main: large clean 16:9 preview canvas
  Right: inspector panel

Overlay timing section:
  compact list of overlay timing rows OR compact blocks

Audio timeline:
  waveform/cuts remain visible below

Playback controls
```

The overlay workspace should feel like the main area in Overlay mode.

## Preview canvas requirements

The preview canvas must be the hero of Overlay Editor mode.

Requirements:
- large centered 16:9 frame
- contained inside its panel
- no overflow outside frame
- dark/black preview background
- optional subtle safe-margin guides
- selected overlay has clear bounding box
- overlays are draggable only inside the frame
- text/logo/CTA placeholders never appear outside the preview frame
- no overlay text bleeding near timeline

Make it visually clean.

The current tiny awkward overlay canvas inside a huge black preview is not good enough. The 16:9 frame itself should be obvious and usable.

## Inspector panel requirements

Right-side inspector should be clean and obvious.

Use sections:

### Overlay Actions
Buttons:
- Add Text
- Add Logo
- Add CTA
- Reset Intro

### Layers
Show a simple list of overlays:
- Intro Black Fade
- Howards Logo
- Property Title
- End CTA

Clicking a layer selects it.
Use clear selected state.
This layer list replaces the need for huge confusing overlay labels on the timeline.

### Selected Overlay
For selected overlay, show only relevant fields.

For text/CTA:
- Name
- Text
- Start
- End
- In transition
- Out transition
- Duration
- Position X/Y
- Size/font size
- Opacity
- Delete button

For logo:
- Name
- Start
- End
- In transition
- Out transition
- Position X/Y
- Width/scale
- Opacity
- Delete button

For background overlay:
- Name
- Start
- End
- Opacity
- Out transition

If no overlay is selected, show:

```text
Select a layer to edit.
```

Do not cram all controls into one dense block. Use spacing, labels, and clear grouping.

## Overlay timing UI requirements

The current overlay lane is confusing. Replace or simplify it.

Preferred first pass:
- Use a clean compact `Overlay Timing` panel below the preview workspace.
- Each overlay is one row.
- Row shows:
  - layer name
  - start time input
  - end time input
  - small visual duration bar
- The visual bar can be simple and does not need complex dragging if it causes layout mess.

If dragging timing blocks already works cleanly, keep it, but it must not cover or clutter the waveform.

Important:
- Overlay timing UI must not overlap the waveform.
- Overlay timing labels must not be huge.
- Overlay timing must feel secondary and tidy.

## Audio timeline in Overlay mode

Keep the waveform visible below the overlay editor so timing context remains available.

But:
- waveform should not be visually dominated by overlay labels
- overlay timing rows should be separate from waveform
- cut markers should remain readable
- no overlay text should appear on top of waveform

## Beat Match mode

Do not regress Beat Match mode.

Beat Match mode should stay clean:
- no overlay canvas
- no overlay inspector
- no overlay timing UI
- clean preview panel
- waveform and cut workflow remain primary

## Visual style

Use the existing dark editor style.

Aim for:
- clean panels
- clear hierarchy
- enough spacing
- subtle borders
- Howards green only for active/selected states and primary actions
- compact but readable controls

Avoid:
- floating panels over timeline
- overlapping z-index tricks
- massive labels on waveform
- giant ghost text outside canvas
- cramped controls
- unclear selected states

## Suggested components

You may update or create:
- `OverlayCanvas.tsx`
- `OverlayInspector.tsx`
- `OverlayTimingPanel.tsx` if useful
- `EditorLayout.tsx`
- `App.tsx`
- `TopToolbar.tsx` only if needed
- CSS/Tailwind classes as needed

Keep changes focused on frontend UI.

## Acceptance checklist

After implementation:

- Beat Match mode still looks clean.
- Overlay Editor mode has a clear large preview canvas.
- Overlay placeholders are only visible inside the preview canvas.
- Right inspector is clean, readable, and grouped.
- Layer list exists and selecting layers is obvious.
- Overlay timing controls are tidy and do not overlap waveform.
- Waveform remains readable.
- No overlay text bleeds into timeline.
- No panel covers another panel.
- Export still creates:
  - `<Property Name>.mp3`
  - `<Property Name>.json`
  - `<Property Name>.overlays.json`
- Existing timing JSON format remains unchanged.

## Testing

Run:
- `git diff --check`
- `npm run build`

Smoke test:
- import MP3
- switch to Overlay Editor
- select each default overlay from the layer list
- drag text/logo/CTA in canvas
- edit text and timing
- switch back to Beat Match mode
- export folder

## Output summary required

When done, summarize:
- changed files
- layout changes
- confirmation timing JSON stayed unchanged
- tests run
- limitations/TODOs
