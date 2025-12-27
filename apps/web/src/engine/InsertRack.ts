import { InsertSlot } from "./InsertSlot";

export class InsertRack {
  readonly input: GainNode;
  readonly output: GainNode;
  readonly slots: InsertSlot[];

  constructor(ctx: AudioContext, slotCount = 4) {
    this.input = ctx.createGain();
    this.output = ctx.createGain();
    this.slots = [];

    let prev: AudioNode = this.input;
    for (let i = 0; i < slotCount; i++) {
      const slot = new InsertSlot(ctx);
      prev.connect(slot.input);
      prev = slot.output;
      this.slots.push(slot);
    }
    prev.connect(this.output);
  }

  moveSlot(from: number, to: number) {
    if (from === to) return;
    const n = this.slots.length;
    if (from < 0 || to < 0 || from >= n || to >= n) return;

    const slot = this.slots.splice(from, 1)[0];
    this.slots.splice(to, 0, slot);

    try { this.input.disconnect(); } catch {}
    for (const s of this.slots) {
      try { s.input.disconnect(); } catch {}
      try { s.output.disconnect(); } catch {}
    }

    let prev: AudioNode = this.input;
    for (const s of this.slots) {
      prev.connect(s.input);
      prev = s.output;
    }
    prev.connect(this.output);
  }
}
