# SHEAR Instruments Suite (Separate Plugins)

Added 4 instrument plugins under `/examples/`:

- `examples/shear-synth` → `com.shear.synth` (DSP synth, poly, filter, ADSR)
- `examples/shear-piano` → `com.shear.piano` (sample-based, root sample C4 placeholder)
- `examples/shear-organ` → `com.shear.organ` (additive/tonewheel-style drawbars)
- `examples/shear-keys` → `com.shear.keys` (sample-based EP placeholder w/ trem + drive)

## Install
Zip the contents of each plugin folder and install via the existing plugin installer.

## Host
A minimal loader panel was added:
- `apps/web/src/ui/InstrumentsPanel.tsx`
- `apps/web/src/engine/BasicInstrumentController.ts`

Generated: Sat Dec 27 19:19:09 2025
