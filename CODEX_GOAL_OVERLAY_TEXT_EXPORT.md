# Codex Goal: Add Overlay/Text Timing Export to Howards Beat Matcher

## Context

This repo is the local web app **Howards Beat Matcher**.

The app currently lets us:
- import an MP3
- generate suggested cut markers
- manually edit beat/cut markers
- export a property folder containing:
  - `<Property Name>.mp3`
  - `<Property Name>.json`

The existing `<Property Name>.json` is used by the Howards video editing/rendering tool for clip timing. That file must stay exactly compatible.

## Critical compatibility rule

Do **not** change the existing timing JSON format.

The existing timing JSON must continue to output only:

```json
{
  "timing_plan": [
    { "clip_number": 1, "length_seconds": 1.486 },
    { "clip_number": 2, "length_seconds": 0.975 }
  ]
}
```

Do not add text, logo, CTA, overlay, property name, duration, cuts, or metadata fields to this existing file.

Instead, add a **second companion JSON export file** for text/logo/overlay timing and positioning.

Suggested output folder:

```text
<Property Name>/
  <Property Name>.mp3
  <Property Name>.json
  <Property Name>.overlays.json
```

Where:
- `<Property Name>.json` = existing timing plan, unchanged
- `<Property Name>.overlays.json` = new overlay/text/logo/CTA config

---

## Goal

Add a simple overlay planning system to the Beat Matcher app.

This should let us place and time:
- text overlays
- Howards logo placeholder
- intro black opacity overlay that fades out
- end CTA text/button placeholder

The tool still does **not** need to show real video. It should remain an audio/timing tool with a blank preview canvas.

The preview panel should now act as a simple **layout canvas**:
- Landscape aspect ratio, default 16:9.
- Dark/blank background.
- Text/logo placeholders can be dragged around.
- Positions should be saved as normalized percentage coordinates so the video renderer can place them correctly later.

This is for real estate listing videos, so the text transition styles should be clean and professional, not gimmicky.

---

## UI requirements

### Add a new overlay editing area/panel

Add a lightweight overlay editor to the existing UI. Keep the app focused and do not overcomplicate.

Possible UI layout:
- Keep the top toolbar.
- Keep the waveform timeline.
- Use the existing preview panel as the overlay layout canvas.
- Add a right-side or bottom inspector panel for selected overlay settings.

### Preview/layout canvas

The blank preview panel should support:
- showing text placeholders
- showing a logo placeholder
- showing CTA placeholder
- dragging overlays to reposition them
- selecting an overlay by clicking it
- showing a simple bounding box/handle around the selected overlay

Do not require real video preview.

### Overlay controls

Add controls to:
- Add Text
- Add Logo Placeholder
- Add CTA
- Reset Default Intro Overlay
- Delete selected overlay

For selected overlays, allow editing:
- label/name
- text content for text/CTA layers
- start time
- end time
- transition style
- position
- size/scale
- alignment where useful

Keep the controls simple. This does not need to become a full video editor.

---

## Timeline behavior for overlays

The main waveform timeline already has cut markers. Keep that as the main timeline.

Add visible overlay timing blocks/strips either:
- above the waveform timeline, or
- in a compact lane below the waveform

Requirements:
- Overlay timing blocks should show where each text/logo/CTA layer appears in the audio timeline.
- User should be able to drag the start/end edges of an overlay timing block.
- User should be able to move the whole overlay block along the timeline.
- Use the same time scale and zoom as the audio timeline.
- Overlay timing must be independent from cut markers.
- Do not change cut marker behavior.

If implementing draggable overlay timing blocks is too much for a first pass, implement editable start/end fields in the inspector first, but structure the code so overlay timeline blocks can be added cleanly after.

---

## Default overlays

When an MP3 is loaded, create sensible default overlays:

### 1. Intro black opacity overlay

Add a black opaque/semi-opaque overlay for the first second of the video that fades out slowly.

Default:
```json
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
```

Purpose:
- darken the first moment of the video
- make intro title/logo more readable
- then fade away smoothly

### 2. Logo placeholder

Add a logo placeholder near the start.

Default:
- type: `logo`
- start: `0.2`
- end: `3.5`
- position: top-left or top-right
- transition: fade in/out
- asset reference: `"howards_logo"`

### 3. Optional title text placeholder

Add a clean property title placeholder.

Default:
- type: `text`
- text: `"Property Title"`
- start: `0.35`
- end: `3.5`
- position: lower-left safe area
- transition: fade in/out

### 4. End CTA

Add an end CTA placeholder near the end of the audio.

Default:
- type: `cta`
- text: `"Book your AI listing video with Howards"`
- start: `max(duration_seconds - 4.0, 0)`
- end: `duration_seconds`
- position: centered or lower-center
- transition: fade in/out

---

## Text transition options

Add a small set of clean professional transition options.

Supported transition styles:
- `none`
- `fade`
- `slide_up_fade`
- `slide_left_fade`
- `typewriter`

Definitions:
- `none`: appears/disappears instantly.
- `fade`: opacity fades in/out.
- `slide_up_fade`: subtle upward motion with fade.
- `slide_left_fade`: subtle horizontal motion with fade.
- `typewriter`: letters appear across the text over the transition duration.

Avoid flashy/cheap effects.

Per overlay, export:

```json
"transition": {
  "in": "fade",
  "out": "fade",
  "duration_seconds": 0.4
}
```

For typewriter:

```json
"transition": {
  "in": "typewriter",
  "out": "fade",
  "duration_seconds": 0.8
}
```

---

## Overlay export format

Create a new file:

```text
<Property Name>.overlays.json
```

Recommended schema:

```json
{
  "version": 1,
  "canvas": {
    "aspect_ratio": "16:9",
    "width": 1920,
    "height": 1080,
    "coordinate_system": "normalized"
  },
  "audio": {
    "duration_seconds": 92.45
  },
  "overlays": [
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
    },
    {
      "id": "logo_1",
      "type": "logo",
      "name": "Howards Logo",
      "asset": {
        "kind": "placeholder",
        "ref": "howards_logo"
      },
      "start_seconds": 0.2,
      "end_seconds": 3.5,
      "position": {
        "x": 0.08,
        "y": 0.08,
        "anchor": "top_left"
      },
      "size": {
        "width": 0.16,
        "height": "auto"
      },
      "style": {
        "opacity": 1
      },
      "transition": {
        "in": "fade",
        "out": "fade",
        "duration_seconds": 0.35
      }
    },
    {
      "id": "title_1",
      "type": "text",
      "name": "Property Title",
      "text": "Property Title",
      "start_seconds": 0.35,
      "end_seconds": 3.5,
      "position": {
        "x": 0.08,
        "y": 0.78,
        "anchor": "bottom_left"
      },
      "style": {
        "font_family": "Inter",
        "font_weight": 600,
        "font_size": 0.045,
        "color": "#FFFFFF",
        "opacity": 1,
        "letter_spacing": 0
      },
      "transition": {
        "in": "slide_up_fade",
        "out": "fade",
        "duration_seconds": 0.45
      }
    },
    {
      "id": "cta_1",
      "type": "cta",
      "name": "End CTA",
      "text": "Book your AI listing video with Howards",
      "start_seconds": 88.45,
      "end_seconds": 92.45,
      "position": {
        "x": 0.5,
        "y": 0.72,
        "anchor": "center"
      },
      "style": {
        "font_family": "Inter",
        "font_weight": 600,
        "font_size": 0.04,
        "color": "#FFFFFF",
        "background_color": "#0B7A3B",
        "background_opacity": 0.92,
        "padding_x": 0.025,
        "padding_y": 0.014,
        "border_radius": 0.018
      },
      "transition": {
        "in": "fade",
        "out": "fade",
        "duration_seconds": 0.4
      }
    }
  ]
}
```

### Coordinate system

Use normalized coordinates:
- `x: 0` = left
- `x: 1` = right
- `y: 0` = top
- `y: 1` = bottom

This makes the overlay file independent of exact render resolution.

For sizes:
- text `font_size` should be normalized relative to canvas height or width. Document which one in code comments.
- logo width should be normalized relative to canvas width.
- keep `height: "auto"` supported for logo placeholders.

---

## Export behavior

The export modal should still ask for:
- Property/video name
- Export location

On export:
1. Save MP3 as `<Property Name>.mp3`
2. Save existing timing JSON unchanged as `<Property Name>.json`
3. Save overlay JSON as `<Property Name>.overlays.json`

Do not break existing export.

If overlay data is empty for any reason, still export a valid overlays file with:
```json
{
  "version": 1,
  "canvas": {
    "aspect_ratio": "16:9",
    "width": 1920,
    "height": 1080,
    "coordinate_system": "normalized"
  },
  "audio": {
    "duration_seconds": 0
  },
  "overlays": []
}
```

---

## Import/reopen behavior

When importing MP3 + existing timing JSON:
- existing cut restoration should work exactly as it does now
- default overlays can be created fresh based on the MP3 duration

If user also imports an overlays JSON in the future, it should restore overlays, but this is optional for the first pass.

For this goal:
- Add optional import support for `<Property Name>.overlays.json` if straightforward.
- If not straightforward, leave a clean TODO and keep default overlay generation.

---

## Data/types

Add TypeScript types for overlays, for example:

```ts
export type OverlayType = "text" | "logo" | "cta" | "background_overlay";

export type OverlayTransitionName =
  | "none"
  | "fade"
  | "slide_up_fade"
  | "slide_left_fade"
  | "typewriter";

export interface OverlayLayer {
  id: string;
  type: OverlayType;
  name: string;
  start_seconds: number;
  end_seconds: number;
  position?: {
    x: number;
    y: number;
    anchor: "top_left" | "top_right" | "bottom_left" | "bottom_right" | "center";
  };
  size?: {
    width?: number;
    height?: number | "auto";
  };
  text?: string;
  asset?: {
    kind: "placeholder";
    ref: string;
  };
  style?: Record<string, unknown>;
  transition: {
    in: OverlayTransitionName;
    out: OverlayTransitionName;
    duration_seconds: number;
  };
}
```

Keep the exported JSON keys snake_case, because this file will be consumed outside the React app.

---

## Implementation expectations

Suggested new files/components:
- `frontend/src/types.ts` may be extended with overlay types.
- `frontend/src/utils/overlays.ts`
  - createDefaultOverlays(duration)
  - serializeOverlayConfig(overlays, duration)
  - sanitize/validate overlay times
- `frontend/src/components/OverlayCanvas.tsx`
  - render blank 16:9 canvas
  - render text/logo/CTA placeholders
  - support drag-to-position
  - select overlay
- `frontend/src/components/OverlayInspector.tsx`
  - edit selected overlay
  - text content
  - start/end
  - transition style
  - delete
- `frontend/src/components/OverlayTimelineLane.tsx`
  - optional first pass
  - show overlay blocks on same time scale as waveform
- `frontend/src/hooks/useOverlays.ts`
  - overlay state actions
  - add/delete/update/select overlays
  - create defaults from duration

Keep code clean and simple.

---

## Important non-goals

Do not:
- change existing timing JSON format
- add extra fields to `<Property Name>.json`
- change backend analyser behavior
- change beat/cut marker behavior
- add video rendering
- add actual logo asset upload unless easy
- turn this into a full video editor
- add complex keyframe animation
- add flashy transitions
- remove existing manual beat matching functionality

---

## Testing checklist

After implementation, verify:

1. Existing MP3 import still works.
2. Existing suggested cuts still work.
3. Manual cut editing still works.
4. Existing timing JSON export is unchanged.
5. Export folder now includes:
   - `<Property Name>.mp3`
   - `<Property Name>.json`
   - `<Property Name>.overlays.json`
6. Overlay JSON is valid JSON.
7. Overlay JSON contains default intro black fade, logo placeholder, title placeholder, and CTA.
8. Dragging text/logo on preview updates normalized position.
9. Editing start/end times updates overlay data.
10. Transition dropdown exports correct values.
11. Preview flash on cuts still works.
12. Timeline zoom still works.
13. No marker labels, no cut list/table, no analyser beat guide lines.

Run:
- `git diff --check`
- backend Python checks if touched
- frontend build if dependencies are available

Summarize:
- changed files
- how to use the new overlay feature
- tests run
- any limitations/TODOs
