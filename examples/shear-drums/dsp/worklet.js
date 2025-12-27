class ShearDrumsProcessor extends AudioWorkletProcessor {
  constructor() {
    super();
    this.params = { master: 0.9, humanize: 0.0, swing: 0.0 };
    this.samples = {}; // key -> { ch0, ch1, len }
    this.voices = [];
    this.maxVoices = 64;

    // output buses: 0=mix, 1=kick, 2=snare, 3=tom1, 4=tom2, 5=floor1, 6=floor2, 7=cymbals, 8=room
    this.busMap = { kick: 1, snare: 2, tom1: 3, tom2: 4, floor: 5, floor2: 6, cymbals: 7, room: 8 };

    this.port.onmessage = (e) => {
      const msg = e.data;
      if (!msg) return;
      if (msg.type === "state" && msg.state?.params) Object.assign(this.params, msg.state.params);
      if (msg.type === "param") this.params[msg.paramId] = msg.value;

      if (msg.type === "loadSample") {
        const { key, ch0, ch1 } = msg;
        this.samples[key] = { ch0: new Float32Array(ch0), ch1: new Float32Array(ch1), len: ch0.length };
      }

      if (msg.type === "midi" && msg.on) this.noteOn(msg.note, msg.vel ?? 100);
    };
  }

  noteToKey(note) {
    const map = {
      36:"kick",
      38:"snare",
      42:"hh_closed",
      46:"hh_open",
      48:"tom1",
      45:"tom2",
      41:"floor",
      43:"floor2",
      49:"crash1",
      51:"ride"
    };
    return map[note] || null;
  }

  keyToStem(key) {
    if (key === "kick") return "kick";
    if (key === "snare") return "snare";
    if (key === "tom1") return "tom1";
    if (key === "tom2") return "tom2";
    if (key === "floor") return "floor";
    if (key === "floor2") return "floor2";
    return "cymbals";
  }

  noteOn(note, vel) {
    const key = this.noteToKey(note);
    if (!key) return;
    const s = this.samples[key];
    if (!s) return;

    const stem = this.keyToStem(key);
    const bus = this.busMap[stem] ?? 1;
    const gain = (vel / 127) * 1.2;

    this.voices.push({ key, bus, pos: 0, gain });
    if (this.voices.length > this.maxVoices) this.voices.shift();
  }

  process(inputs, outputs) {
    if (!outputs || outputs.length === 0) return true;

    // clear all outputs
    for (let o = 0; o < outputs.length; o++) {
      const out = outputs[o];
      if (!out || out.length < 2) continue;
      const L = out[0], R = out[1];
      for (let i = 0; i < L.length; i++) { L[i] = 0; R[i] = 0; }
    }

    const master = this.params.master ?? 0.9;
    const mixOut = outputs[0];

    const still = [];
    for (const v of this.voices) {
      const s = this.samples[v.key];
      const stemOut = outputs[v.bus];
      if (!s || !mixOut || mixOut.length < 2 || !stemOut || stemOut.length < 2) continue;

      const mL = mixOut[0], mR = mixOut[1];
      const sL = stemOut[0], sR = stemOut[1];

      for (let i = 0; i < mL.length; i++) {
        const p = v.pos + i;
        if (p >= s.len) break;
        const l = s.ch0[p] * v.gain;
        const r = s.ch1[p] * v.gain;
        mL[i] += l; mR[i] += r;
        sL[i] += l; sR[i] += r;
      }

      v.pos += mL.length;
      if (v.pos < s.len) still.push(v);
    }
    this.voices = still;

    // master gain all outs
    for (let o = 0; o < outputs.length; o++) {
      const out = outputs[o];
      if (!out || out.length < 2) continue;
      const L = out[0], R = out[1];
      for (let i = 0; i < L.length; i++) { L[i] *= master; R[i] *= master; }
    }

    return true;
  }
}
registerProcessor("shear:drums", ShearDrumsProcessor);
