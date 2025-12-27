# Drum Bus Processing (Option 4)

Adds a dedicated Drum Bus with:
- NY-style parallel processing chain (send -> inserts -> return)
- Post-sum drum bus inserts ("glue" chain)
- Controls: bus gain, dry, parallel blend, parallel return
- UI to load/bypass/unload/reorder FX in each chain

## Engine
- `apps/web/src/engine/DrumBusProcessor.ts`
- `apps/web/src/engine/DrumStemMixer.ts` now exposes `bus` without auto-connecting to monitor.
- `apps/web/src/engine/DrumTrackController.ts` routes `mixer.bus -> drumBus -> monitor`

## UI
- `apps/web/src/ui/DrumBusPanel.tsx`

Generated: Sat Dec 27 19:08:59 2025
