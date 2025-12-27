import { InstrumentSlot } from "./InstrumentSlot";
import { PluginUrlResolver } from "../plugins/host/PluginUrlResolver";
import type { PluginManifest } from "../plugins/types";
import { loadPluginWavAsset } from "../amp/PluginAssetLoader";
import { DrumStemMixer, type StemId } from "./DrumStemMixer";
import { DrumBusProcessor } from "./DrumBusProcessor";

const STEMS: Array<{ id: StemId; name: string; outputIndex: number }> = [
  { id: "mix", name: "Mix", outputIndex: 0 },
  { id: "kick", name: "Kick", outputIndex: 1 },
  { id: "snare", name: "Snare", outputIndex: 2 },
  { id: "tom1", name: "Tom 1", outputIndex: 3 },
  { id: "tom2", name: "Tom 2", outputIndex: 4 },
  { id: "floor", name: "Floor Tom 1", outputIndex: 5 },
  { id: "floor2", name: "Floor Tom 2", outputIndex: 6 },
  { id: "cymbals", name: "Cymbals/OH", outputIndex: 7 },
  { id: "room", name: "Room", outputIndex: 8 }
];

export class DrumTrackController {
  readonly ctx: AudioContext;
  readonly instrument: InstrumentSlot;
  readonly mixer: DrumStemMixer;
  readonly drumBus: DrumBusProcessor;

  constructor(ctx: AudioContext, monitorBus: GainNode) {
    this.ctx = ctx;
    this.instrument = new InstrumentSlot(ctx);
    this.mixer = new DrumStemMixer(ctx, STEMS.map(s => ({ id: s.id, name: s.name })));

    this.drumBus = new DrumBusProcessor(ctx);

    // Route stems sum -> drum bus -> monitor
    this.mixer.bus.connect(this.drumBus.input);
    this.drumBus.output.connect(monitorBus);
  }

  async loadDrums(resolver: PluginUrlResolver, manifest: PluginManifest) {
    await this.instrument.loadInstrument({
      resolver,
      manifest,
      pluginId: "com.shear.drums",
      version: "1.0.0",
      processor: "shear:drums",
      workletOptions: { numberOfInputs: 0, numberOfOutputs: 9, outputChannelCount: [2,2,2,2,2,2,2,2,2] }
    });

    const node = this.instrument.getNode();
    if (!node) throw new Error("Instrument not loaded");

    for (const stem of STEMS) {
      const tap = this.ctx.createGain();
      tap.gain.value = 1.0;
      node.connect(tap, stem.outputIndex, 0);
      tap.connect(this.mixer.getChannel(stem.id)!.input);
    }

    const kits = (manifest as any).assets?.kits?.rock_standard;
    if (!kits) return;
    for (const k of Object.keys(kits)) {
      const buf = await loadPluginWavAsset({
        audioCtx: this.ctx,
        resolver,
        pluginId: "com.shear.drums",
        version: "1.0.0",
        path: kits[k]
      });
      const ch0 = buf.getChannelData(0).slice();
      const ch1 = (buf.numberOfChannels > 1 ? buf.getChannelData(1) : buf.getChannelData(0)).slice();
      await this.instrument.loadSample(k, ch0, ch1);
    }
  }

  setParam(id: string, v: number) { this.instrument.setParam(id, v); }
  midi(note: number, vel: number) { this.instrument.sendMidi(note, vel, true); }

  gain(stem: StemId, g: number) { this.mixer.setGain(stem, g); }
  pan(stem: StemId, p: number) { this.mixer.setPan(stem, p); }
  mute(stem: StemId, m: boolean) { this.mixer.setMute(stem, m); }
  solo(stem: StemId, s: boolean) { this.mixer.setSolo(stem, s); }
  stems() { return this.mixer.channels; }
  stem(id: StemId) { return this.mixer.getChannel(id); }

  // Drum bus controls
  setDrumBusGain(v: number) { this.drumBus.setBusGain(v); }
  setParallelBlend(v: number) { this.drumBus.setParallelBlend(v); }
  setParallelReturn(v: number) { this.drumBus.setParallelReturn(v); }
  setDry(v: number) { this.drumBus.setDry(v); }
}
