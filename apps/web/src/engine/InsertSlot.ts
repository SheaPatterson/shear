import type { PluginManifest } from "../plugins/types";
import { PluginUrlResolver } from "../plugins/host/PluginUrlResolver";
import { AmpChain } from "../amp/AmpChain";

export type LoadedPlugin = {
  pluginId: string;
  version: string;
  manifest: PluginManifest;
  processor: string;
};

export class InsertSlot {
  readonly ctx: AudioContext;
  readonly input: GainNode;
  readonly output: GainNode;

  private passthrough: GainNode;
  private worklet?: AudioWorkletNode;
  private ampChain?: AmpChain;
  private loaded?: LoadedPlugin;
  private paramState: Record<string, number> = {};
  private bypassed = false;

  constructor(ctx: AudioContext) {
    this.ctx = ctx;
    this.input = ctx.createGain();
    this.output = ctx.createGain();
    this.passthrough = ctx.createGain();
    this.input.connect(this.passthrough).connect(this.output);
  }

  getLoadedPlugin(): LoadedPlugin | undefined {
    return this.loaded;
  }

  getParams(): Record<string, number> {
    return { ...this.paramState };
  }

  isBypassed() { return this.bypassed; }

  async loadPlugin(args: {
    resolver: PluginUrlResolver;
    manifest: PluginManifest;
    pluginId: string;
    version: string;
    processor?: string;
  }) {
    this.unload();

    const processor = args.processor ?? (args.pluginId === "com.shear.amp" ? "shear:amp" : "shear:fx");

    const workletUrl = await args.resolver.getBlobUrl(args.pluginId, args.version, "dsp/worklet.js");
    await this.ctx.audioWorklet.addModule(workletUrl);

    this.worklet = new AudioWorkletNode(this.ctx, processor);

    // init defaults from manifest
    const init: Record<string, number> = {};
    for (const p of args.manifest.params) init[p.id] = p.default;
    this.paramState = init;

    this.loaded = { pluginId: args.pluginId, version: args.version, manifest: args.manifest, processor };

    // route
    this.input.disconnect();
    this.passthrough.disconnect();

    if (args.pluginId === "com.shear.amp") {
      this.ampChain = new AmpChain(this.ctx, this.worklet);
      this.input.connect(this.worklet);
      this.ampChain.connect(this.output);
    } else {
      this.input.connect(this.worklet);
      this.worklet.connect(this.output);
    }

    // send init state
    this.worklet.port.postMessage({ type: "state", state: { params: this.paramState } });

    // prime amp cab
    if (args.pluginId === "com.shear.amp" && this.ampChain) {
      const cab = this.paramState["cab"] ?? 2;
      const mic = this.paramState["mic"] ?? 0;
      const air = this.paramState["air"] ?? 0.1;
      const cabMix = this.paramState["cabMix"] ?? 1.0;

      this.ampChain.setCabMix(cabMix);
      await this.ampChain.updateCabFromPlugin({
        resolver: args.resolver,
        manifest: args.manifest,
        pluginId: args.pluginId,
        version: args.version,
        params: { cab, mic, air, cabMix }
      });
    }
  }

  unload() {
    try { this.input.disconnect(); } catch {}
    try { this.passthrough.disconnect(); } catch {}
    try { this.worklet?.disconnect(); } catch {}
    try { this.ampChain?.disconnect(); } catch {}
    this.worklet = undefined;
    this.ampChain = undefined;
    this.loaded = undefined;
    this.paramState = {};
    this.bypassed = false;
    this.input.connect(this.passthrough).connect(this.output);
  }

  async setParam(paramId: string, value: number, args?: { resolver?: PluginUrlResolver }) {
    this.paramState[paramId] = value;
    if (!this.worklet || !this.loaded) return;

    const isAmp = this.loaded.pluginId === "com.shear.amp";
    if (isAmp && (paramId === "cab" || paramId === "mic" || paramId === "air" || paramId === "cabMix")) {
      if (!this.ampChain || !args?.resolver) return;
      const cab = this.paramState["cab"] ?? 2;
      const mic = this.paramState["mic"] ?? 0;
      const air = this.paramState["air"] ?? 0.1;
      const cabMix = this.paramState["cabMix"] ?? 1.0;
      this.ampChain.setCabMix(cabMix);
      await this.ampChain.updateCabFromPlugin({
        resolver: args.resolver,
        manifest: this.loaded.manifest,
        pluginId: this.loaded.pluginId,
        version: this.loaded.version,
        params: { cab, mic, air, cabMix }
      });
      return;
    }

    this.worklet.port.postMessage({ type: "param", paramId, value });
  }

  bypass(on: boolean) {
    this.bypassed = on;
    try { this.input.disconnect(); } catch {}
    try { this.passthrough.disconnect(); } catch {}
    if (on || !this.worklet) {
      this.input.connect(this.passthrough).connect(this.output);
    } else {
      if (this.loaded?.pluginId === "com.shear.amp" && this.worklet) {
        this.input.connect(this.worklet);
      } else if (this.worklet) {
        this.input.connect(this.worklet);
      }
    }
  }
}
