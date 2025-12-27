import { useMemo, useState } from "react";
import { JamPanel } from "../jam/JamPanel";
import { LiveKitJamProvider } from "../jam/LiveKitJamProvider";
import { FxHostPanel } from "./FxHostPanel";
import { DrumEditorPanel } from "./DrumEditorPanel";
import { DrumMixerPanel } from "./DrumMixerPanel";
import { DrumBusPanel } from "./DrumBusPanel";
import { InstrumentsPanel } from "./InstrumentsPanel";
import { BasicInstrumentController } from "../engine/BasicInstrumentController";
import { DrumTrackController } from "../engine/DrumTrackController";
import { PluginPackageStore } from "../plugins/install/PluginPackageStore";
import { PluginUrlResolver } from "../plugins/host/PluginUrlResolver";
import { parseManifest } from "../plugins/install/readManifest";
import type { PluginManifest } from "../plugins/types";

async function loadInstalledManifest(store: PluginPackageStore, pluginId: string, version: string): Promise<PluginManifest> {
  const blob = await store.getFile(pluginId, version, "manifest.json");
  if (!blob) throw new Error("manifest.json missing");
  return parseManifest(await blob.text());
}

export function App() {
  const [projectId] = useState("demo-project");

  const audioCtx = useMemo(() => new AudioContext(), []);
  const monitorBus = useMemo(() => {
    const g = audioCtx.createGain();
    g.gain.value = 1;
    g.connect(audioCtx.destination);
    return g;
  }, [audioCtx]);

  const jam = useMemo(() => new LiveKitJamProvider(audioCtx, monitorBus), [audioCtx, monitorBus]);
  const drums = useMemo(() => new DrumTrackController(audioCtx, monitorBus), [audioCtx, monitorBus]);
  const instruments = useMemo(() => new BasicInstrumentController(audioCtx, monitorBus), [audioCtx, monitorBus]);

  async function loadDrums() {
    await audioCtx.resume();
    const store = new PluginPackageStore();
    const resolver = new PluginUrlResolver();
    const manifest = await loadInstalledManifest(store, "com.shear.drums", "1.0.0");
    await drums.loadDrums(resolver, manifest);
  }

  return (
    <div style={{ padding: 16, fontFamily: "system-ui, sans-serif" }}>
      <h1 style={{ margin: 0 }}>SHEAR</h1>
      <p style={{ opacity: 0.75, marginTop: 6 }}>Modern web recording DAW scaffold.</p>

      <FxHostPanel audioCtx={audioCtx} monitorBus={monitorBus} projectId={projectId} />

      <div style={{ border: "1px solid #333", borderRadius: 12, padding: 12, marginTop: 12 }}>
        <h3 style={{ margin: 0 }}>Drums</h3>
        <p style={{ opacity: 0.75, marginTop: 6 }}>
          Install <code>SHEAR | Drums</code> (zip contents of <code>examples/shear-drums/</code>) via the plugin installer, then load it here.
          Multi-out enabled: Mix + Kick + Snare + Tom1 + Tom2 + Floor + Cymbals/OH + Room.
        </p>
        <button onClick={loadDrums}>Load Drums Instrument</button>
      </div>

      <InstrumentsPanel instruments={instruments} audioCtx={audioCtx} />

      <DrumBusPanel drums={drums} />

      <DrumMixerPanel drums={drums} />

      <DrumEditorPanel ctx={audioCtx} controller={drums} projectId={projectId} />

      <div style={{ height: 16 }} />

      <JamPanel
        jam={jam}
        projectId={projectId}
        participants={[
          { userId: "alice", display: "Alice" },
          { userId: "bob", display: "Bob" }
        ]}
      />
    </div>
  );
}
