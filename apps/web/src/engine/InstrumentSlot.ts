import type { PluginManifest } from "../plugins/types";
import { PluginUrlResolver } from "../plugins/host/PluginUrlResolver";

export type LoadedInstrument = {
  pluginId: string;
  version: string;
  manifest: PluginManifest;
  processor: string;
};

export class InstrumentSlot {
  readonly ctx: AudioContext;
  private node?: AudioWorkletNode;
  private loaded?: LoadedInstrument;
  private paramState: Record<string, number> = {};

  constructor(ctx: AudioContext) {
    this.ctx = ctx;
  }

  getLoaded() { return this.loaded; }
  getParams() { return { ...this.paramState }; }
  getNode() { return this.node; }

  async loadInstrument(args: {
    resolver: PluginUrlResolver;
    manifest: PluginManifest;
    pluginId: string;
    version: string;
    processor: string;
    workletOptions?: AudioWorkletNodeOptions;
  }) {
    const url = await args.resolver.getBlobUrl(args.pluginId, args.version, "dsp/worklet.js");
    await this.ctx.audioWorklet.addModule(url);
    this.node = new AudioWorkletNode(this.ctx, args.processor, args.workletOptions);

    const init: Record<string, number> = {};
    for (const p of args.manifest.params) init[p.id] = p.default;
    this.paramState = init;

    this.node.port.postMessage({ type: "state", state: { params: this.paramState } });
    this.loaded = { pluginId: args.pluginId, version: args.version, manifest: args.manifest, processor: args.processor };
  }

  setParam(paramId: string, value: number) {
    this.paramState[paramId] = value;
    this.node?.port.postMessage({ type: "param", paramId, value });
  }

  sendMidi(note: number, vel: number, on = true) {
    this.node?.port.postMessage({ type: "midi", note, vel, on });
  }

  async loadSample(key: string, ch0: Float32Array, ch1: Float32Array) {
    this.node?.port.postMessage({ type: "loadSample", key, ch0, ch1 }, [ch0.buffer, ch1.buffer]);
  }
}
