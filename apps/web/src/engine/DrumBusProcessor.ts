import { InsertRack } from "./InsertRack";
import { PluginUrlResolver } from "../plugins/host/PluginUrlResolver";
import type { PluginManifest } from "../plugins/types";

/**
 * Drum bus processing:
 *  - DRY: passes through to the bus sum
 *  - PARALLEL: send -> parallel inserts -> blend back (NY style)
 *  - BUS INSERTS: applied after dry+parallel sum (glue EQ/comp/sat/etc.)
 */
export class DrumBusProcessor {
  readonly ctx: AudioContext;

  readonly input: GainNode;
  readonly output: GainNode;

  // dry path
  private dry: GainNode;

  // parallel path
  readonly parallelSend: GainNode;
  readonly parallelInserts: InsertRack;
  readonly parallelReturn: GainNode;

  // bus inserts (post-sum)
  readonly busInserts: InsertRack;
  readonly busGain: GainNode;

  constructor(ctx: AudioContext) {
    this.ctx = ctx;

    this.input = ctx.createGain();
    this.output = ctx.createGain();

    // --- Dry path ---
    this.dry = ctx.createGain();
    this.dry.gain.value = 1.0;

    // --- Parallel path ---
    this.parallelSend = ctx.createGain();
    this.parallelSend.gain.value = 0.0; // blend amount (0..1)
    this.parallelInserts = new InsertRack(ctx, 4);
    this.parallelReturn = ctx.createGain();
    this.parallelReturn.gain.value = 1.0;

    // --- Bus inserts ---
    this.busInserts = new InsertRack(ctx, 4);
    this.busGain = ctx.createGain();
    this.busGain.gain.value = 1.0;

    // wiring:
    // input -> dry -> busInserts
    // input -> parallelSend -> parallelInserts -> parallelReturn -> busInserts
    this.input.connect(this.dry);

    this.input.connect(this.parallelSend);
    this.parallelSend.connect(this.parallelInserts.input);
    this.parallelInserts.output.connect(this.parallelReturn);

    // sum dry + parallel into bus inserts input
    this.dry.connect(this.busInserts.input);
    this.parallelReturn.connect(this.busInserts.input);

    // bus inserts -> busGain -> output
    this.busInserts.output.connect(this.busGain);
    this.busGain.connect(this.output);
  }

  setBusGain(v: number) { this.busGain.gain.value = v; }
  setDry(v: number) { this.dry.gain.value = v; }
  setParallelBlend(v: number) { this.parallelSend.gain.value = v; }
  setParallelReturn(v: number) { this.parallelReturn.gain.value = v; }

  async loadBusFx(slotIndex: number, args: { resolver: PluginUrlResolver; manifest: PluginManifest; pluginId: string; version: string; processor: string; }) {
    const slot = this.busInserts.slots[slotIndex];
    await slot.loadPlugin(args);
  }

  async loadParallelFx(slotIndex: number, args: { resolver: PluginUrlResolver; manifest: PluginManifest; pluginId: string; version: string; processor: string; }) {
    const slot = this.parallelInserts.slots[slotIndex];
    await slot.loadPlugin(args);
  }
}
