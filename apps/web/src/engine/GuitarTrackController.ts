import { InsertRack } from "./InsertRack";
import { PluginUrlResolver } from "../plugins/host/PluginUrlResolver";
import type { PluginManifest } from "../plugins/types";
import { loadRackPresets, saveRackPresets, makeRackPreset, type RackPreset } from "./presets";

export class GuitarTrackController {
  readonly ctx: AudioContext;
  readonly monitorBus: GainNode;
  readonly rack: InsertRack;
  readonly trackGain: GainNode;

  private mediaStream?: MediaStream;
  private inputNode?: MediaStreamAudioSourceNode;

  private recorder?: MediaRecorder;
  private recordedChunks: Blob[] = [];

  constructor(ctx: AudioContext, monitorBus: GainNode) {
    this.ctx = ctx;
    this.monitorBus = monitorBus;

    this.rack = new InsertRack(ctx, 4);
    this.trackGain = ctx.createGain();
    this.trackGain.gain.value = 1.0;

    this.rack.output.connect(this.trackGain);
    this.trackGain.connect(this.monitorBus);
  }

  async startInput(deviceId?: string) {
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: {
        deviceId: deviceId ? { exact: deviceId } : undefined,
        echoCancellation: false,
        noiseSuppression: false,
        autoGainControl: false
      }
    });
    this.mediaStream = stream;
    this.inputNode = this.ctx.createMediaStreamSource(stream);
    this.inputNode.connect(this.rack.input);
  }

  stopInput() {
    try { this.inputNode?.disconnect(); } catch {}
    this.inputNode = undefined;
    if (this.mediaStream) for (const t of this.mediaStream.getTracks()) t.stop();
    this.mediaStream = undefined;
  }

  async setParam(slotIndex: number, paramId: string, value: number, resolver?: PluginUrlResolver) {
    await this.rack.slots[slotIndex].setParam(paramId, value, { resolver });
  }

  bypass(slotIndex: number, on: boolean) {
    this.rack.slots[slotIndex].bypass(on);
  }

  moveSlot(from: number, to: number) {
    this.rack.moveSlot(from, to);
  }

  listPresets(): RackPreset[] { return loadRackPresets(); }

  saveCurrentPreset(name: string) {
    const presets = loadRackPresets();
    const p = makeRackPreset({
      name,
      slots: this.rack.slots.map((s, i) => ({
        slotIndex: i,
        bypassed: s.isBypassed(),
        loaded: s.getLoadedPlugin(),
        params: s.getParams()
      }))
    });
    presets.unshift(p);
    saveRackPresets(presets.slice(0, 50));
  }

  async applyPreset(preset: RackPreset, resolver: PluginUrlResolver, manifestResolver: (pluginId: string, version: string) => Promise<PluginManifest>) {
    for (const slotPreset of preset.slots) {
      const slot = this.rack.slots[slotPreset.slotIndex];
      if (!slotPreset.plugin) {
        slot.unload();
        continue;
      }
      const manifest = await manifestResolver(slotPreset.plugin.pluginId, slotPreset.plugin.version);
      await slot.loadPlugin({
        resolver,
        manifest,
        pluginId: slotPreset.plugin.pluginId,
        version: slotPreset.plugin.version,
        processor: slotPreset.plugin.processor
      });
      for (const [k, v] of Object.entries(slotPreset.params)) {
        await slot.setParam(k, v, { resolver });
      }
      slot.bypass(slotPreset.bypassed);
    }
  }

  startRecording() {
    if (!this.mediaStream) throw new Error("Input not started");
    this.recordedChunks = [];
    this.recorder = new MediaRecorder(this.mediaStream);
    this.recorder.ondataavailable = (e) => { if (e.data.size > 0) this.recordedChunks.push(e.data); };
    this.recorder.start();
  }

  stopRecording(): Promise<Blob> {
    return new Promise((resolve, reject) => {
      const r = this.recorder;
      if (!r) return reject(new Error("Not recording"));
      r.onstop = () => resolve(new Blob(this.recordedChunks, { type: r.mimeType || "audio/webm" }));
      r.stop();
      this.recorder = undefined;
    });
  }
}
