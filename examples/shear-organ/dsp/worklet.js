function softclip(x) { return Math.tanh(x); }

class OrganVoice {
  constructor(note, vel, params) {
    this.note = note;
    this.vel = vel/127;
    this.phase = new Float32Array(9).fill(0);
    this.t = 0;
    this.released = false;
    this.relT = 0;
    this.update(params);
    this.f0 = 440 * Math.pow(2, (note-69)/12);
    // drawbar harmonic ratios (Hammond-ish)
    this.rat = [1, 2, 3, 4, 5, 6, 8, 10, 12];
  }
  update(p){
    this.master = p.master ?? 0.9;
    this.click = p.click ?? 0.15;
    this.drive = p.drive ?? 0.1;
    this.db = new Float32Array(9);
    for (let i=0;i<9;i++) this.db[i] = p["db"+(i+1)] ?? (i===0?1:0);
    this.a = p.a ?? 0.01;
    this.r = p.r ?? 0.18;
  }
  noteOff(){ this.released = true; this.relT = 0; }
  env(){
    if (!this.released) {
      const x = Math.min(1, this.t/this.a);
      return x;
    }
    return Math.exp(-this.relT/this.r);
  }
  render(outL,outR){
    const n = outL.length;
    for (let i=0;i<n;i++){
      const e = this.env();
      let s = 0;
      for (let h=0; h<9; h++){
        const ph = this.phase[h];
        s += Math.sin(2*Math.PI*ph) * this.db[h];
        this.phase[h] = ph + (this.f0*this.rat[h])/sampleRate;
      }
      // key click at attack
      const click = (this.t < 0.01) ? ((Math.random()*2-1) * this.click * (1 - this.t/0.01)) : 0;
      s = (s*0.12 + click);
      // drive
      s = softclip(s * (1 + this.drive*8));
      const g = e * Math.pow(this.vel, 0.8) * this.master * 0.9;
      outL[i] += s*g;
      outR[i] += s*g*0.995;
      this.t += 1/sampleRate;
      if (this.released) this.relT += 1/sampleRate;
    }
  }
  done(){ return this.released && this.env() < 0.0008; }
}

class ShearOrganProcessor extends AudioWorkletProcessor {
  constructor(){
    super();
    this.params = {};
    this.voices = [];
    this.maxVoices = 16;
    this.port.onmessage = (e)=>{
      const msg = e.data;
      if (!msg) return;
      if (msg.type==="state" && msg.state?.params) this.params = { ...msg.state.params };
      if (msg.type==="param") this.params[msg.paramId] = msg.value;
      if (msg.type==="midi"){
        if (msg.on) this.noteOn(msg.note, msg.vel ?? 100);
        else this.noteOff(msg.note);
      }
    };
  }
  noteOn(note, vel){
    const v = new OrganVoice(note, vel, this.params);
    this.voices.push(v);
    if (this.voices.length > this.maxVoices) this.voices.shift();
  }
  noteOff(note){ for (const v of this.voices) if (v.note===note && !v.released) v.noteOff(); }
  process(inputs, outputs){
    const out = outputs[0];
    if (!out || out.length<2) return true;
    const L=out[0], R=out[1];
    for (let i=0;i<L.length;i++){ L[i]=0; R[i]=0; }
    for (const v of this.voices) v.update(this.params);
    for (const v of this.voices) v.render(L,R);
    this.voices = this.voices.filter(v=>!v.done());
    return true;
  }
}
registerProcessor("shear:organ", ShearOrganProcessor);
