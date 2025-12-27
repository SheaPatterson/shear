class OnePoleLP {
  constructor(sr) { this.sr = sr; this.z1 = 0; this.a = 0.1; }
  setCutoff(fc) {
    // simple one-pole lowpass coefficient
    const x = Math.exp(-2*Math.PI*fc/this.sr);
    this.a = 1 - x;
  }
  process(x) { this.z1 = this.z1 + this.a*(x - this.z1); return this.z1; }
}

function wave(w, ph) {
  // 0 sine, 1 saw, 2 square, 3 triangle
  const t = ph - Math.floor(ph);
  if (w === 0) return Math.sin(2*Math.PI*t);
  if (w === 1) return 2*t - 1;
  if (w === 2) return t < 0.5 ? 1 : -1;
  // triangle
  return 1 - 4*Math.abs(t - 0.5);
}

class SynthVoice {
  constructor(sr, note, vel, params) {
    this.sr = sr;
    this.note = note;
    this.vel = vel/127;
    this.phase1 = 0;
    this.phase2 = 0;
    this.f = 440 * Math.pow(2, (note-69)/12);
    this.t = 0;
    this.released = false;
    this.releaseT = 0;
    this.lpL = new OnePoleLP(sr);
    this.lpR = new OnePoleLP(sr);
    this.update(params);
  }
  update(p) {
    this.master = p.master ?? 0.9;
    this.wave1 = (p.wave1 ?? 1) | 0;
    this.wave2 = (p.wave2 ?? 2) | 0;
    this.mix2 = p.mix2 ?? 0.35;
    this.detune = p.detune ?? 0.01;
    this.cutoff = p.cutoff ?? 5000;
    this.res = p.res ?? 0.1; // not used in one-pole but kept for future
    this.a = p.a ?? 0.01;
    this.d = p.d ?? 0.2;
    this.s = p.s ?? 0.7;
    this.r = p.r ?? 0.25;
    this.lpL.setCutoff(this.cutoff);
    this.lpR.setCutoff(this.cutoff);
  }
  noteOff() { this.released = true; this.releaseT = 0; }
  env() {
    if (!this.released) {
      // ADS (no sustain stage release)
      const t = this.t;
      if (t < this.a) return (t/this.a);
      if (t < this.a + this.d) {
        const x = (t - this.a)/this.d;
        return 1 + (this.s - 1)*x;
      }
      return this.s;
    } else {
      // release from current sustain level
      const x = this.releaseT;
      const start = (this.t < this.a) ? (this.t/this.a) : (this.t < this.a + this.d ? (1 + (this.s-1)*((this.t-this.a)/this.d)) : this.s);
      const e = start * Math.exp(-x/this.r);
      return e;
    }
  }
  render(outL, outR) {
    const n = outL.length;
    const f2 = this.f * (1 + this.detune);
    for (let i=0;i<n;i++) {
      const e = this.env();
      const s1 = wave(this.wave1, this.phase1);
      const s2 = wave(this.wave2, this.phase2);
      let s = (s1*(1-this.mix2) + s2*this.mix2);
      // soft clip
      s = Math.tanh(s*1.2);
      // filter
      const l = this.lpL.process(s);
      const r = this.lpR.process(s*0.995);
      const g = e * this.vel * this.master * 0.5;
      outL[i] += l*g;
      outR[i] += r*g;
      this.phase1 += this.f/this.sr;
      this.phase2 += f2/this.sr;
      this.t += 1/this.sr;
      if (this.released) this.releaseT += 1/this.sr;
    }
  }
  done() { return this.released && this.env() < 0.0008; }
}

class ShearSynthProcessor extends AudioWorkletProcessor {
  constructor() {
    super();
    this.params = {};
    this.voices = [];
    this.maxVoices = 16;

    this.port.onmessage = (e) => {
      const msg = e.data;
      if (!msg) return;
      if (msg.type === "state" && msg.state?.params) this.params = { ...msg.state.params };
      if (msg.type === "param") this.params[msg.paramId] = msg.value;
      if (msg.type === "midi") {
        if (msg.on) this.noteOn(msg.note, msg.vel ?? 100);
        else this.noteOff(msg.note);
      }
    };
  }

  noteOn(note, vel) {
    const v = new SynthVoice(sampleRate, note, vel, this.params);
    this.voices.push(v);
    if (this.voices.length > this.maxVoices) this.voices.shift();
  }
  noteOff(note) {
    for (const v of this.voices) if (v.note === note && !v.released) v.noteOff();
  }

  process(inputs, outputs) {
    const out = outputs[0];
    if (!out || out.length < 2) return true;
    const L = out[0], R = out[1];
    for (let i=0;i<L.length;i++) { L[i]=0; R[i]=0; }

    // update voices params (cheap)
    for (const v of this.voices) v.update(this.params);

    for (const v of this.voices) v.render(L,R);
    this.voices = this.voices.filter(v => !v.done());
    return true;
  }
}
registerProcessor("shear:synth", ShearSynthProcessor);
