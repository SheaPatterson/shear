import type { PluginManifest } from "../plugins/types";
import { PluginUrlResolver } from "../plugins/host/PluginUrlResolver";
import { resolveAmpIR } from "./AmpCabIR";

type Params = { cab: number; mic: number; air: number; cabMix: number };

export class AmpChain {
  private ctx: AudioContext;
  private workletNode: AudioWorkletNode;

  private convolver: ConvolverNode;
  private wetGain: GainNode;
  private dryGain: GainNode;
  private out: GainNode;

  private lastKey = "";
  private lastUpdateAt = 0;

  constructor(ctx: AudioContext, workletNode: AudioWorkletNode) {
    this.ctx = ctx;
    this.workletNode = workletNode;

    this.convolver = ctx.createConvolver();
    this.wetGain = ctx.createGain();
    this.dryGain = ctx.createGain();
    this.out = ctx.createGain();

    this.workletNode.connect(this.dryGain).connect(this.out);
    this.workletNode.connect(this.convolver).connect(this.wetGain).connect(this.out);

    this.setCabMix(1.0);
  }

  connect(dest: AudioNode) { this.out.connect(dest); }
  disconnect() { this.out.disconnect(); }

  setCabMix(mix: number) {
    const m = Math.max(0, Math.min(1, mix));
    this.wetGain.gain.value = m;
    this.dryGain.gain.value = 1 - m;
  }

  async updateCabFromPlugin(args: {
    resolver: PluginUrlResolver;
    manifest: PluginManifest;
    pluginId: string;
    version: string;
    params: Params;
  }) {
    const cab = Math.max(0, Math.min(2, Math.round(args.params.cab))) as 0|1|2;
    const mic = Math.max(0, Math.min(2, Math.round(args.params.mic))) as 0|1|2;

    const key = `${cab}:${mic}`;
    const now = performance.now();
    if (key === this.lastKey) return;
    if (now - this.lastUpdateAt < 150) return;

    this.lastKey = key;
    this.lastUpdateAt = now;

    const ir = await resolveAmpIR({
      audioCtx: this.ctx,
      resolver: args.resolver,
      manifest: args.manifest as any,
      pluginId: args.pluginId,
      version: args.version,
      cab,
      mic
    });

    this.convolver.buffer = ir;
  }
}
