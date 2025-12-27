import { InsertRack } from "./InsertRack";

export type StemId = "mix" | "kick" | "snare" | "tom1" | "tom2" | "floor" | "floor2" | "cymbals" | "room";

export type StemChannel = {
  id: StemId;
  name: string;
  input: GainNode;
  inserts: InsertRack;
  fader: GainNode;
  panner: StereoPannerNode;
  mute: boolean;
  solo: boolean;
};

export class DrumStemMixer {
  readonly ctx: AudioContext;
  /** Sum of all stems after per-stem inserts/fader/pan. */
  readonly bus: GainNode;
  readonly channels: StemChannel[];

  constructor(ctx: AudioContext, channelIds: Array<{ id: StemId; name: string }>) {
    this.ctx = ctx;
    this.bus = ctx.createGain();
    this.bus.gain.value = 1.0;

    this.channels = channelIds.map(({ id, name }) => {
      const input = ctx.createGain();
      const inserts = new InsertRack(ctx, 4);
      const fader = ctx.createGain();
      fader.gain.value = 1.0;
      const panner = ctx.createStereoPanner();
      panner.pan.value = 0;

      input.connect(inserts.input);
      inserts.output.connect(fader);
      fader.connect(panner);
      panner.connect(this.bus);

      return { id, name, input, inserts, fader, panner, mute: false, solo: false };
    });
  }

  setGain(id: StemId, gain: number) {
    const ch = this.channels.find(c => c.id === id);
    if (!ch) return;
    ch.fader.gain.value = gain;
  }

  setPan(id: StemId, pan: number) {
    const ch = this.channels.find(c => c.id === id);
    if (!ch) return;
    ch.panner.pan.value = pan;
  }

  setMute(id: StemId, mute: boolean) {
    const ch = this.channels.find(c => c.id === id);
    if (!ch) return;
    ch.mute = mute;
    this.applySoloMute();
  }

  setSolo(id: StemId, solo: boolean) {
    const ch = this.channels.find(c => c.id === id);
    if (!ch) return;
    ch.solo = solo;
    this.applySoloMute();
  }

  applySoloMute() {
    const anySolo = this.channels.some(c => c.solo);
    for (const c of this.channels) {
      const shouldMute = anySolo ? !c.solo : c.mute;
      c.input.gain.value = shouldMute ? 0 : 1;
    }
  }

  getChannel(id: StemId) {
    return this.channels.find(c => c.id === id);
  }
}
