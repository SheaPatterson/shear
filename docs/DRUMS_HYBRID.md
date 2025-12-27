# SHEAR | Drums (Hybrid Mode - C)

This adds a drum instrument plugin package plus a DAW-level Drum Editor.

## Plugin package
`examples/shear-drums/`
- `manifest.json` (instrument, MIDI enabled, assets.kits mapping)
- `dsp/worklet.js` (sample player worklet: receives sample buffers + MIDI notes)
- `ui/index.html` (pads + master)
- `assets/kits/rock_standard/samples/*.wav` (starter one-shots)

## Host code
- `apps/web/src/engine/InstrumentSlot.ts`
- `apps/web/src/engine/DrumTrackController.ts`
- `apps/web/src/ui/DrumEditorPanel.tsx` (16-step grid scheduler)

## Usage
1. Zip the CONTENTS of `examples/shear-drums/` and install via plugin installer.
2. In app: click "Load Drums Instrument"
3. Use Drum Editor → Play/Stop.

Generated: Sat Dec 27 17:10:35 2025
