import { InstrumentSlot } from "./InstrumentSlot";
import type { PluginManifest } from "../plugins/types";
import { PluginUrlResolver } from "../plugins/host/PluginUrlResolver";
import { PluginPackageStore } from "../plugins/install/PluginPackageStore";
import { parseManifest } from "../plugins/install/readManifest";
import { loadPluginWavAsset } from "../amp/PluginAssetLoader";

async function loadInstalledManifest(store: PluginPackageStore, pluginId: string, version: string): Promise<PluginManifest> {
  const blob = await store.getFile(pluginId, version, "manifest.json");
  if (!blob) throw new Error("manifest.json missing");
  return parseManifest(await blob.text());
}

export class BasicInstrumentController {
  readonly ctx: AudioContext;
  readonly slot: InstrumentSlot;
  readonly output: GainNode;

  constructor(ctx: AudioContext, monitorBus: GainNode) {
    this.ctx = ctx;
    this.slot = new InstrumentSlot(ctx);
    this.output = ctx.createGain();
    this.output.gain.value = 1.0;
    this.output.connect(monitorBus);
  }

  async load(pluginId: string, version = "1.0.0") {
    const store = new PluginPackageStore();
    const resolver = new PluginUrlResolver();
    const manifest = await loadInstalledManifest(store, pluginId, version);

    await this.slot.loadInstrument({
      resolver,
      manifest,
      pluginId,
      version,
      processor: manifest.supports?.midi ? (manifest as any).processor ?? (pluginId === "com.shear.synth" ? "shear:synth" :
        pluginId === "com.shear.piano" ? "shear:piano" :
        pluginId === "com.shear.organ" ? "shear:organ" :
        pluginId === "com.shear.keys" ? "shear:keys" : "shear:fx") : "shear:fx"
    });

    const node = this.slot.getNode();
    if (!node) throw new Error("Instrument node missing");

    // connect instrument output to monitor
    node.connect(this.output);

    // sample-based instruments: load root sample if present
    const samples = (manifest as any).assets?.samples;
    if (samples?.root) {
      const buf = await loadPluginWavAsset({
        audioCtx: this.ctx,
        resolver,
        pluginId,
        version,
        path: samples.root
      });
      const ch0 = buf.getChannelData(0).slice();
      const ch1 = (buf.numberOfChannels > 1 ? buf.getChannelData(1) : buf.getChannelData(0)).slice();
      // sendSample with rootNote
      node.port.postMessage({ type: "loadSample", ch0, ch1, rootNote: samples.rootNote ?? 60 }, [ch0.buffer, ch1.buffer]);
    }
  }

  midi(note: number, vel: number, on = true) {
    this.slot.sendMidi(note, vel, on);
  }

  setParam(id: string, v: number) {
    this.slot.setParam(id, v);
  }
}
