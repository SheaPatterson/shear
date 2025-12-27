class ShearAmpProcessor extends AudioWorkletProcessor {
  constructor() {
    super();
    this.params = {
      input: 0,
      gain: 0.35,
      model: 0, // 0 clean, 1 crunch, 2 hi-gain
      os: 1,    // 0 off, 1 2x
      bass: 0,
      mid: 0,
      treble: 0,
      presence: 0.3,
      master: 0.9,
      gate: -60
    };
    this.env = 0;
    this._prevIn = 0;

    this.port.onmessage = (e) => {
      const msg = e.data;
      if (msg?.type === "param" && msg.paramId in this.params) this.params[msg.paramId] = msg.value;
      if (msg?.type === "state" && msg.state?.params) Object.assign(this.params, msg.state.params);
    };
  }

  dbToGain(db) { return Math.pow(10, db / 20); }

  sat(x, drive, model) {
    const k = 1 + drive * (model === 2 ? 45 : model === 1 ? 28 : 14);
    if (model === 2) x = x * 1.2;
    if (model === 0) return Math.tanh(x * k);

    const a = Math.tanh((x + 0.02) * k);
    const b = Math.tanh((x - 0.01) * (k * 0.92));
    return 0.55 * a + 0.45 * b;
  }

  processOS2(x, drive, model) {
    const x0 = this._prevIn;
    this._prevIn = x;
    const up0 = x0;
    const up1 = (x0 + x) * 0.5;
    const y0 = this.sat(up0, drive, model);
    const y1 = this.sat(up1, drive, model);
    return (y0 + y1) * 0.5;
  }

  process(inputs, outputs) {
    const input = inputs[0];
    const output = outputs[0];
    if (!input || !output) return true;

    const inGain = this.dbToGain(this.params.input);
    const gateThresh = this.dbToGain(this.params.gate);
    const drive = this.params.gain;
    const model = Math.max(0, Math.min(2, Math.round(this.params.model)));
    const os = Math.max(0, Math.min(1, Math.round(this.params.os)));
    const master = this.params.master;

    for (let ch = 0; ch < output.length; ch++) {
      const inCh = input[Math.min(ch, input.length - 1)];
      const outCh = output[ch];
      if (!inCh || !outCh) continue;

      for (let i = 0; i < outCh.length; i++) {
        let s = inCh[i] * inGain;

        this.env = Math.max(Math.abs(s), this.env * 0.99);
        if (this.env < gateThresh) s = 0;

        s = os === 1 ? this.processOS2(s, drive, model) : this.sat(s, drive, model);

        s += s * this.params.presence * 0.15;
        outCh[i] = s * master;
      }
    }
    return true;
  }
}
registerProcessor("shear:amp", ShearAmpProcessor);
