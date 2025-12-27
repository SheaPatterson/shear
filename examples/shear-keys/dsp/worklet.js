function softclip(x){ return Math.tanh(x); }
class OnePoleLP {
  constructor(sr){ this.sr=sr; this.z1=0; this.a=0.1; }
  setCutoff(fc){ const x=Math.exp(-2*Math.PI*fc/this.sr); this.a=1-x; }
  process(x){ this.z1=this.z1+this.a*(x-this.z1); return this.z1; }
}

class KeysVoice {
  constructor(note, vel, sample, params){
    this.note=note;
    this.vel=vel/127;
    this.sample=sample;
    this.pos=0.0;
    this.released=false;
    this.relT=0.0;
    this.update(params);
    const root=params._rootNote ?? 60;
    this.rate=Math.pow(2,(note-root)/12);
  }
  update(p){
    this.master=p.master ?? 0.9;
    this.tone=p.tone ?? 0.0;
    this.drive=p.drive ?? 0.15;
    this.tremRate=p.tremRate ?? 4.5;
    this.tremDepth=p.tremDepth ?? 0.35;
    this.release=p.release ?? 0.6;
    const fc=900 + (this.tone+1)*5200;
    if (!this.lpL){ this.lpL=new OnePoleLP(sampleRate); this.lpR=new OnePoleLP(sampleRate); this.ph=0; }
    this.lpL.setCutoff(fc); this.lpR.setCutoff(fc);
  }
  noteOff(){ this.released=true; this.relT=0; }
  amp(){
    const v=Math.pow(this.vel,1.0);
    if (!this.released) return v;
    return v*Math.exp(-this.relT/this.release);
  }
  render(outL,outR){
    const L=this.sample.L, R=this.sample.R, len=this.sample.len;
    for (let i=0;i<outL.length;i++){
      const idx=this.pos|0;
      if (idx>=len-1) break;
      const frac=this.pos-idx;
      let l=L[idx]*(1-frac)+L[idx+1]*frac;
      let r=R[idx]*(1-frac)+R[idx+1]*frac;

      // tremolo
      const trem = 1 - this.tremDepth + this.tremDepth*(0.5+0.5*Math.sin(2*Math.PI*this.ph));
      this.ph += this.tremRate/sampleRate;

      // drive + filter
      l = this.lpL.process(softclip(l*(1+this.drive*8)));
      r = this.lpR.process(softclip(r*(1+this.drive*8)));

      const a=this.amp()*this.master*trem;
      outL[i]+=l*a;
      outR[i]+=r*a;

      this.pos+=this.rate;
      if (this.released) this.relT += 1/sampleRate;
    }
  }
  done(){ return (this.pos>=this.sample.len-2) || (this.released && this.amp()<0.0007); }
}

class ShearKeysProcessor extends AudioWorkletProcessor {
  constructor(){
    super();
    this.params={};
    this.sample=null;
    this.voices=[];
    this.maxVoices=20;

    this.port.onmessage=(e)=>{
      const msg=e.data;
      if (!msg) return;
      if (msg.type==="state" && msg.state?.params) this.params={...msg.state.params};
      if (msg.type==="param") this.params[msg.paramId]=msg.value;

      if (msg.type==="loadSample"){
        const { ch0, ch1, rootNote } = msg;
        this.sample={ L:new Float32Array(ch0), R:new Float32Array(ch1), len: ch0.length };
        this.params._rootNote = rootNote ?? 60;
      }

      if (msg.type==="midi"){
        if (msg.on) this.noteOn(msg.note, msg.vel ?? 100);
        else this.noteOff(msg.note);
      }
    };
  }

  noteOn(note, vel){
    if (!this.sample) return;
    const v=new KeysVoice(note, vel, this.sample, this.params);
    this.voices.push(v);
    if (this.voices.length>this.maxVoices) this.voices.shift();
  }
  noteOff(note){ for (const v of this.voices) if (v.note===note && !v.released) v.noteOff(); }

  process(inputs, outputs){
    const out=outputs[0];
    if (!out || out.length<2) return true;
    const L=out[0], R=out[1];
    for (let i=0;i<L.length;i++){ L[i]=0; R[i]=0; }

    for (const v of this.voices) v.update(this.params);
    for (const v of this.voices) v.render(L,R);
    this.voices = this.voices.filter(v=>!v.done());
    return true;
  }
}
registerProcessor("shear:keys", ShearKeysProcessor);
