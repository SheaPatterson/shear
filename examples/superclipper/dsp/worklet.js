class SuperClipperProcessor extends AudioWorkletProcessor {
  constructor(options) {
    super();
    const init = options.processorOptions?.initialState || {};
    this.params = { drive: init.params?.drive ?? 0.2, mix: init.params?.mix ?? 1.0 };
    this.port.onmessage = (e) => {
      const msg = e.data;
      if (msg?.type === "param" && msg.paramId in this.params) this.params[msg.paramId] = msg.value;
      if (msg?.type === "state" && msg.state?.params) Object.assign(this.params, msg.state.params);
    };
  }
  process(inputs, outputs) {
    const input = inputs[0];
    const output = outputs[0];
    if (!input || !output) return true;
    const drive = this.params.drive;
    const mix = this.params.mix;
    for (let ch = 0; ch < output.length; ch++) {
      const inCh = input[ch];
      const outCh = output[ch];
      if (!inCh || !outCh) continue;
      for (let i = 0; i < outCh.length; i++) {
        const dry = inCh[i];
        const driven = dry * (1 + drive * 10);
        const clipped = Math.max(-1, Math.min(1, driven));
        outCh[i] = dry * (1 - mix) + clipped * mix;
      }
    }
    return true;
  }
}
registerProcessor("shear:com.shear.superclipper", SuperClipperProcessor);
