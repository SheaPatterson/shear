import { useMemo, useState } from "react";
import type { DrumTrackController } from "../engine/DrumTrackController";
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

type Chain = "bus" | "parallel";

export function DrumBusPanel(props: { drums: DrumTrackController }) {
  const store = useMemo(() => new PluginPackageStore(), []);
  const resolver = useMemo(() => new PluginUrlResolver(), []);
  const [chain, setChain] = useState<Chain>("parallel");
  const [slotIndex, setSlotIndex] = useState(0);
  const [status, setStatus] = useState("ready");
  const [tick, setTick] = useState(0);

  const busSlots = props.drums.drumBus.busInserts.slots;
  const parSlots = props.drums.drumBus.parallelInserts.slots;
  const slots = chain === "bus" ? busSlots : parSlots;

  async function loadToSlot(pluginId: string, version: string) {
    try {
      setStatus(`loading ${pluginId}@${version}…`);
      const manifest = await loadInstalledManifest(store, pluginId, version);
      const processor = pluginId === "com.shear.amp" ? "shear:amp" : "shear:fx";
      await slots[slotIndex].loadPlugin({ resolver, manifest, pluginId, version, processor });
      setStatus("ready");
      setTick(t => t + 1);
    } catch (e: any) {
      setStatus(String(e?.message || e));
    }
  }

  function unload(i: number) { slots[i].unload(); setTick(t => t + 1); }
  function bypass(i: number, on: boolean) { slots[i].bypass(on); setTick(t => t + 1); }
  function move(from: number, to: number) {
    const rack = chain === "bus" ? props.drums.drumBus.busInserts : props.drums.drumBus.parallelInserts;
    rack.moveSlot(from, to);
    setSlotIndex(to);
    setTick(t => t + 1);
  }

  return (
    <div style={{ border: "1px solid #333", borderRadius: 12, padding: 12, marginTop: 12 }}>
      <h3 style={{ margin: 0 }}>Drum Bus</h3>
      <p style={{ opacity: 0.7, marginTop: 6 }}>
        NY-style parallel chain + post-sum drum bus inserts. This is where the “glue” lives.
      </p>

      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center", marginTop: 10 }}>
        <label style={{ display: "flex", gap: 6, alignItems: "center" }}>
          Bus Gain
          <input type="range" min={0} max={2} step={0.001} defaultValue={1}
            onChange={(e) => props.drums.setDrumBusGain(Number(e.target.value))} />
        </label>

        <label style={{ display: "flex", gap: 6, alignItems: "center" }}>
          Parallel Blend
          <input type="range" min={0} max={1} step={0.001} defaultValue={0}
            onChange={(e) => props.drums.setParallelBlend(Number(e.target.value))} />
        </label>

        <label style={{ display: "flex", gap: 6, alignItems: "center" }}>
          Parallel Return
          <input type="range" min={0} max={2} step={0.001} defaultValue={1}
            onChange={(e) => props.drums.setParallelReturn(Number(e.target.value))} />
        </label>

        <label style={{ display: "flex", gap: 6, alignItems: "center" }}>
          Dry
          <input type="range" min={0} max={1} step={0.001} defaultValue={1}
            onChange={(e) => props.drums.setDry(Number(e.target.value))} />
        </label>

        <span style={{ opacity: 0.75 }}>{status}</span>
      </div>

      <div style={{ marginTop: 12, display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
        <label style={{ display: "flex", gap: 6, alignItems: "center" }}>
          Chain
          <select value={chain} onChange={(e) => { setChain(e.target.value as Chain); setSlotIndex(0); }}>
            <option value="parallel">Parallel (NY)</option>
            <option value="bus">Bus Inserts (Glue)</option>
          </select>
        </label>

        <label style={{ display: "flex", gap: 6, alignItems: "center" }}>
          Slot
          <select value={slotIndex} onChange={(e) => setSlotIndex(Number(e.target.value))}>
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
                <div style={{ fontWeight: 800 }}>Slot {i + 1}{i === slotIndex ? " (selected)" : ""}</div>
                <div style={{ opacity: 0.75, fontSize: 12 }}>
                  {loaded ? `${loaded.manifest.name} • ${loaded.pluginId}@${loaded.version}` : "Empty"}
                  {loaded ? (bypassed ? " • BYPASSED" : "") : ""}
                </div>
              </div>

              <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                <button onClick={() => setSlotIndex(i)}>Select</button>
                <button onClick={() => bypass(i, true)} disabled={!loaded}>Bypass</button>
                <button onClick={() => bypass(i, false)} disabled={!loaded}>Un-bypass</button>
                <button onClick={() => unload(i)} disabled={!loaded}>Unload</button>
                <button onClick={() => move(i, Math.max(0, i - 1))} disabled={i === 0}>↑</button>
                <button onClick={() => move(i, Math.min(slots.length - 1, i + 1))} disabled={i === slots.length - 1}>↓</button>
              </div>
            </div>
          );
        })}
      </div>

      <PluginBrowser onLoadToSlot={async (pluginId, version) => loadToSlot(pluginId, version)} />

      <p style={{ opacity: 0.65, marginTop: 10 }}>
        Tip: Put a “smash” compressor in Parallel and keep Blend low (0.05–0.25). Put EQ/sat/glue comp in Bus Inserts.
      </p>
    </div>
  );
}
