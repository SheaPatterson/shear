# SHEAR Drums - Multi-out Mixer/Stems (Option B)

Implemented multi-output drums with split toms:
- Outputs: Mix, Kick, Snare, Tom1, Tom2, Floor, Cymbals/OH, Room (all stereo)

## Changes
- `examples/shear-drums/dsp/worklet.js`: multi-output mixing
- `apps/web/src/engine/InstrumentSlot.ts`: supports AudioWorkletNodeOptions
- `apps/web/src/engine/DrumStemMixer.ts`: stem mixer w/ per-stem insert racks + mute/solo
- `apps/web/src/engine/DrumTrackController.ts`: connects outputs → stems
- `apps/web/src/ui/DrumMixerPanel.tsx`: mixer UI

Generated: Sat Dec 27 17:33:23 2025
