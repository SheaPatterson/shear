import { useEffect, useMemo, useState } from "react";
import type { DrumTrackController } from "../engine/DrumTrackController";
import type { StemId } from "../engine/DrumStemMixer";
import { PluginPackageStore } from "../plugins/install/PluginPackageStore";
import { PluginUrlResolver } from "../plugins/host/PluginUrlResolver";
import { parseManifest } from "../plugins/install/readManifest";
import type { PluginManifest } from "../plugins/types";
import { PluginBrowser } from "./PluginBrowser";

async function loadInstalledManifest(store: PluginPackageStore, pluginId: string, version: string): Promise<PluginManifest> {
  const blob = await store.getFile(pluginId, version, "manifest.json");
  if (!blob) throw new Error("manifest.json missing");
  return parseManifest(await blob.text());
}

export function DrumStemFxPanel(props: { drums: DrumTrackController; stemId: StemId; }) {
  const store = useMemo(() => new PluginPackageStore(), []);
  const resolver = useMemo(() => new PluginUrlResolver(), []);
  const [selectedSlot, setSelectedSlot] = useState(0);
  const [status, setStatus] = useState<string>("ready");
  const [tick, setTick] = useState(0);

  const stem = props.drums.stem(props.stemId);

  useEffect(() => {
    setSelectedSlot(0);
    setStatus("ready");
  }, [props.stemId]);

  if (!stem) return null;

  const slots = stem.inserts.slots;

  async function loadToSlot(pluginId: string, version: string) {
    try {
      setStatus(`loading ${pluginId}@${version}…`);
      const manifest = await loadInstalledManifest(store, pluginId, version);
      const processor = pluginId === "com.shear.amp" ? "shear:amp" : "shear:fx";
      await slots[selectedSlot].loadPlugin({ resolver, manifest, pluginId, version, processor });
      setStatus("ready");
      setTick(t => t + 1);
    } catch (e: any) {
      setStatus(String(e?.message || e));
    }
  }

  return (
    <div style={{ border: "1px solid #333", borderRadius: 12, padding: 12, marginTop: 12 }}>
      <div style={{ display: "flex", gap: 12, alignItems: "baseline", flexWrap: "wrap" }}>
        <h3 style={{ margin: 0 }}>Stem FX — {stem.name}</h3>
        <span style={{ opacity: 0.75 }}>{status}</span>
        <span style={{ opacity: 0.6, fontSize: 12 }}>4 insert slots • bypass/unload/reorder</span>
      </div>

      <div style={{ marginTop: 10, display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
        <label style={{ display: "flex", gap: 6, alignItems: "center" }}>
          Selected slot:
          <select value={selectedSlot} onChange={(e) => setSelectedSlot(Number(e.target.value))}>
            {slots.map((_, i) => <option key={i} value={i}>{i + 1}</option>)}
          </select>
        </label>
      </div>

      <div style={{ marginTop: 10, display: "grid", gridTemplateColumns: "1fr", gap: 8 }}>
        {slots.map((s, i) => {
          const loaded = s.getLoadedPlugin();
          const bypassed = s.isBypassed();
          return (
            <div key={i} style={{ background: "#141414", border: "1px solid #2a2a2a", borderRadius: 10, padding: 10, display: "flex", gap: 10, alignItems: "center" }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 800 }}>Slot {i + 1}{i === selectedSlot ? " (selected)" : ""}</div>
                <div style={{ opacity: 0.75, fontSize: 12 }}>
                  {loaded ? `${loaded.manifest.name} • ${loaded.pluginId}@${loaded.version}` : "Empty"}
                  {loaded ? (bypassed ? " • BYPASSED" : "") : ""}
                </div>
              </div>

              <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                <button onClick={() => setSelectedSlot(i)}>Select</button>
                <button onClick={() => s.bypass(true)} disabled={!loaded}>Bypass</button>
                <button onClick={() => s.bypass(false)} disabled={!loaded}>Un-bypass</button>
                <button onClick={() => s.unload()} disabled={!loaded}>Unload</button>
                <button onClick={() => { stem.inserts.moveSlot(i, Math.max(0, i - 1)); setSelectedSlot(Math.max(0, i - 1)); setTick(t => t + 1); }} disabled={i === 0}>↑</button>
                <button onClick={() => { stem.inserts.moveSlot(i, Math.min(slots.length - 1, i + 1)); setSelectedSlot(Math.min(slots.length - 1, i + 1)); setTick(t => t + 1); }} disabled={i === slots.length - 1}>↓</button>
              </div>
            </div>
          );
        })}
      </div>

      <PluginBrowser onLoadToSlot={async (pluginId, version) => loadToSlot(pluginId, version)} />

      <p style={{ opacity: 0.65, marginTop: 10 }}>
        Note: parameter UI is still generic elsewhere; this panel focuses on per-stem slot management first.
      </p>
    </div>
  );
}
