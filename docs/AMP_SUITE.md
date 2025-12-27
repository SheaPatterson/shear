# SHEAR | Amp — IR Assets (Real-asset pipeline)

This repo includes `examples/shear-amp/` which contains:
- `manifest.json` (includes `assets.irs` mapping)
- `dsp/worklet.js` (amp head AudioWorklet)
- `ui/index.html` (controls)
- `assets/irs/*.wav` (cab/mic IR WAVs)

## How IR loading works
The host uses:
- `PluginUrlResolver` → returns Blob URLs for plugin files stored in IndexedDB
- `decodeAudioData()` → decodes WAV into an AudioBuffer
- `ConvolverNode.buffer = AudioBuffer` → applies cab/mic convolution

Relevant code:
- `apps/web/src/amp/PluginAssetLoader.ts`
- `apps/web/src/amp/AmpCabIR.ts`
- `apps/web/src/amp/AmpChain.ts`

Generated: Sat Dec 27 16:32:49 2025
