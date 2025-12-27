class OnePoleLP {
  constructor(sr) { this.sr = sr; this.z1 = 0; this.a = 0.1; }
  setCutoff(fc) { const x = Math.exp(-2*Math.PI*fc/this.sr); this.a = 1 - x; }
  process(x) { this.z1 = this.z1 + this.a*(x - this.z1); return this.z1; }
}

class PianoVoice {
  constructor(note, vel, sample, params) {
    this.note = note;
    this.vel = vel/127;
    this.sample = sample; // {L,R,len}
    this.pos = 0.0;
    this.released = false;
    this.releaseT = 0.0;
    this.update(params);
    const root = params._rootNote ?? 60;
    this.rate = Math.pow(2, (note - root)/12);
  }
  update(p) {
    this.master = p.master ?? 0.9;
    this.tone = p.tone ?? 0.0;
    this.release = p.release ?? 0.7;
    this.velCurve = p.velCurve ?? 1.0;
    // tone tilt -> LP cutoff
    const fc = 1200 + (this.tone+1)*5200; // 1200..11600
    if (!this.lpL) { this.lpL = new OnePoleLP(sampleRate); this.lpR = new OnePoleLP(sampleRate); }
    this.lpL.setCutoff(fc);
    this.lpR.setCutoff(fc);
  }
  noteOff(){ this.released = true; this.releaseT = 0; }
  amp() {
    const v = Math.pow(this.vel, this.velCurve);
    if (!this.released) return v;
    return v * Math.exp(-this.releaseT/this.release);
  }
  render(outL, outR) {
    const L = this.sample.L, R = this.sample.R, len = this.sample.len;
    for (let i=0;i<outL.length;i++) {
      const idx = this.pos | 0;
      if (idx >= len-1) break;
      const frac = this.pos - idx;
      const l = L[idx]*(1-frac) + L[idx+1]*frac;
      const r = R[idx]*(1-frac) + R[idx+1]*frac;
      const a = this.amp() * this.master;
      outL[i] += this.lpL.process(l) * a;
      outR[i] += this.lpR.process(r) * a;
      this.pos += this.rate;
      if (this.released) this.releaseT += 1/sampleRate;
    }
  }
  done() { return (this.pos >= this.sample.len-2) || (this.released && this.amp() < 0.0007); }
}

class ShearPianoProcessor extends AudioWorkletProcessor {
  constructor() {
    super();
    this.params = {};
    this.sample = null;
    this.voices = [];
    this.maxVoices = 24;

    this.port.onmessage = (e) => {
      const msg = e.data;
      if (!msg) return;
      if (msg.type === "state" && msg.state?.params) this.params = { ...msg.state.params };
      if (msg.type === "param") this.params[msg.paramId] = msg.value;

      if (msg.type === "loadSample") {
        const { ch0, ch1, rootNote } = msg;
        this.sample = { L: new Float32Array(ch0), R: new Float32Array(ch1), len: ch0.length };
        this.params._rootNote = rootNote ?? 60;
      }

      if (msg.type === "midi") {
        if (msg.on) this.noteOn(msg.note, msg.vel ?? 100);
        else this.noteOff(msg.note);
      }
    };
  }

  noteOn(note, vel) {
    if (!this.sample) return;
    const v = new PianoVoice(note, vel, this.sample, this.params);
    this.voices.push(v);
    if (this.voices.length > this.maxVoices) this.voices.shift();
  }
  noteOff(note) { for (const v of this.voices) if (v.note===note && !v.released) v.noteOff(); }

  process(inputs, outputs) {
    const out = outputs[0];
    if (!out || out.length < 2) return true;
    const L = out[0], R = out[1];
    for (let i=0;i<L.length;i++){ L[i]=0; R[i]=0; }

    for (const v of this.voices) v.update(this.params);
    for (const v of this.voices) v.render(L,R);
    this.voices = this.voices.filter(v => !v.done());
    return true;
  }
}
registerProcessor("shear:piano", ShearPianoProcessor);
