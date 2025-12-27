import { useEffect, useMemo, useState } from "react";
import { PluginPackageStore } from "../plugins/install/PluginPackageStore";
import { PluginUrlResolver } from "../plugins/host/PluginUrlResolver";
import type { PluginManifest } from "../plugins/types";
import { parseManifest } from "../plugins/install/readManifest";
import { GuitarTrackController } from "../engine/GuitarTrackController";
import { PluginBrowser } from "./PluginBrowser";
import { loadProjectFxState, saveProjectFxState } from "../engine/projectState";
import { addTake, loadTakeLane, setActiveTake, setCompSimple, loadComp } from "../engine/takes";

async function loadInstalledManifest(store: PluginPackageStore, pluginId: string, version: string): Promise<PluginManifest> {
  const blob = await store.getFile(pluginId, version, "manifest.json");
  if (!blob) throw new Error("manifest.json missing");
  const txt = await blob.text();
  return parseManifest(txt);
}

export function FxHostPanel(props: { audioCtx: AudioContext; monitorBus: GainNode; projectId: string; }) {
  const store = useMemo(() => new PluginPackageStore(), []);
  const resolver = useMemo(() => new PluginUrlResolver(), []);
  const ctrl = useMemo(() => new GuitarTrackController(props.audioCtx, props.monitorBus), [props.audioCtx, props.monitorBus]);

  const [status, setStatus] = useState<string>("idle");
  const [selectedSlot, setSelectedSlot] = useState<number>(0);
  const [recording, setRecording] = useState(false);
  const [lastRecUrl, setLastRecUrl] = useState<string | null>(null);

  const [slotParams, setSlotParams] = useState<Record<string, number>>({
    input: 0, gain: 0.35, model: 0, os: 1,
    bass: 0, mid: 0, treble: 0, presence: 0.3, master: 0.9, gate: -60,
    cab: 2, mic: 0, air: 0.1, cabMix: 1.0
  });

  const [lane, setLane] = useState(() => loadTakeLane(props.projectId, "guitar"));
  const [comp, setComp] = useState(() => loadComp(props.projectId, "guitar"));

  useEffect(() => {
    const s = loadProjectFxState(props.projectId);
    if (s.rackPreset) {
      setStatus("restoring rack…");
      ctrl.applyPreset(
        s.rackPreset,
        resolver,
        async (pluginId, version) => await loadInstalledManifest(store, pluginId, version)
      ).then(() => setStatus("live")).catch(e => setStatus(String(e?.message || e)));
    }
    setLane(loadTakeLane(props.projectId, "guitar"));
    setComp(loadComp(props.projectId, "guitar"));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function startInput() {
    setStatus("starting input…");
    await props.audioCtx.resume();
    await ctrl.startInput();
    setStatus("live");
  }

  function persistProjectRack() {
    const rackPreset = {
      name: "Current Rack",
      createdAt: new Date().toISOString(),
      slots: ctrl.rack.slots.map((s, i) => ({
        slotIndex: i,
        bypassed: s.isBypassed(),
        plugin: s.getLoadedPlugin()
          ? { pluginId: s.getLoadedPlugin()!.pluginId, version: s.getLoadedPlugin()!.version, processor: s.getLoadedPlugin()!.processor }
          : undefined,
        params: s.getParams()
      }))
    };
    saveProjectFxState({ projectId: props.projectId, rackPreset });
  }

  async function loadToSelectedSlot(pluginId: string, version: string, manifest: PluginManifest) {
    setStatus(`loading ${manifest.name} into slot ${selectedSlot + 1}…`);
    await ctrl.rack.slots[selectedSlot].loadPlugin({ resolver, manifest, pluginId, version, processor: pluginId === "com.shear.amp" ? "shear:amp" : "shear:fx" });
    if (pluginId === "com.shear.amp" && selectedSlot === 0) {
      for (const [k, v] of Object.entries(slotParams)) await ctrl.setParam(0, k, v, resolver);
    }
    persistProjectRack();
    setStatus("live");
  }

  async function setParam(id: string, value: number) {
    const next = { ...slotParams, [id]: value };
    setSlotParams(next);
    await ctrl.setParam(0, id, value, resolver);
    persistProjectRack();
  }

  function bypassSelected(on: boolean) {
    ctrl.bypass(selectedSlot, on);
    persistProjectRack();
  }

  function moveSelected(direction: -1 | 1) {
    const to = Math.max(0, Math.min(ctrl.rack.slots.length - 1, selectedSlot + direction));
    ctrl.moveSlot(selectedSlot, to);
    setSelectedSlot(to);
    persistProjectRack();
  }

  async function startRec() {
    ctrl.startRecording();
    setRecording(true);
  }

  async function stopRec() {
    const blob = await ctrl.stopRecording();
    const url = URL.createObjectURL(blob);
    setLastRecUrl(url);
    setRecording(false);
    const updated = addTake(props.projectId, "guitar", blob, `Take ${lane.takes.length + 1}`);
    setLane(updated);
    setComp(setCompSimple(props.projectId, "guitar", updated.activeTakeId!));
  }

  function selectTake(takeId: string) {
    const updated = setActiveTake(props.projectId, "guitar", takeId);
    setLane(updated);
    setComp(setCompSimple(props.projectId, "guitar", takeId));
  }

  return (
    <div style={{ border: "1px solid #333", borderRadius: 12, padding: 12, marginTop: 12 }}>
      <div style={{ display: "flex", gap: 12, alignItems: "baseline", flexWrap: "wrap" }}>
        <h3 style={{ margin: 0 }}>FX Insert Host</h3>
        <span style={{ opacity: 0.75 }}>{status}</span>
        <span style={{ marginLeft: "auto", opacity: 0.7, fontSize: 12 }}>Project: {props.projectId}</span>
      </div>

      <div style={{ marginTop: 10, display: "flex", gap: 8, flexWrap: "wrap" }}>
        <button onClick={startInput}>Start Input</button>

        <label style={{ display: "flex", gap: 6, alignItems: "center" }}>
          Slot:
          <select value={selectedSlot} onChange={(e) => setSelectedSlot(Number(e.target.value))}>
            {ctrl.rack.slots.map((_, i) => <option key={i} value={i}>{i + 1}</option>)}
          </select>
        </label>

        <button onClick={() => bypassSelected(true)}>Bypass</button>
        <button onClick={() => bypassSelected(false)}>Un-bypass</button>
        <button onClick={() => moveSelected(-1)}>Move Up</button>
        <button onClick={() => moveSelected(1)}>Move Down</button>

        {!recording ? <button onClick={startRec}>Record Take</button> : <button onClick={stopRec}>Stop</button>}
        {lastRecUrl ? <a href={lastRecUrl} download="shear_take.webm">Download last take</a> : null}
      </div>

      <PluginBrowser onLoadToSlot={loadToSelectedSlot} />

      <div style={{ marginTop: 12 }}>
        <h4 style={{ margin: "0 0 8px 0" }}>Slot 1 Controls (Amp)</h4>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 10 }}>
          {Object.entries(slotParams).map(([k, v]) => {
            const isDb = k === "input" || k === "bass" || k === "mid" || k === "treble" || k === "gate";
            const isInt = k === "cab" || k === "mic" || k === "model" || k === "os";
            const min =
              k === "input" ? -24 :
              (k === "bass" || k === "mid" || k === "treble") ? -12 :
              k === "gate" ? -80 :
              0;
            const max =
              k === "input" ? 24 :
              (k === "bass" || k === "mid" || k === "treble") ? 12 :
              k === "gate" ? 0 :
              (k === "model" ? 2 : (k === "os" ? 1 : (isInt ? 2 : 1)));
            const step =
              isDb ? (k === "gate" ? 1 : 0.1) :
              (isInt ? 1 : 0.001);

            return (
              <div key={k} style={{ background: "#141414", border: "1px solid #2a2a2a", borderRadius: 10, padding: 10 }}>
                <div style={{ fontSize: 12, opacity: 0.8, marginBottom: 6 }}>{k}: <span style={{ opacity: 0.85 }}>{String(v)}</span></div>
                <input
                  type="range"
                  min={min}
                  max={max}
                  step={step}
                  value={v}
                  onChange={(e) => setParam(k, Number(e.target.value))}
                  style={{ width: "100%" }}
                />
              </div>
            );
          })}
        </div>
        <p style={{ opacity: 0.65, marginTop: 8 }}>
          Model: 0=Clean, 1=Crunch, 2=HiGain • Oversample: 1 enables 2× (recommended for HiGain).
        </p>
      </div>

      <div style={{ marginTop: 12 }}>
        <h4 style={{ margin: "0 0 8px 0" }}>Take Lanes (Guitar) + Simple Comp</h4>
        {lane.takes.length === 0 ? (
          <p style={{ opacity: 0.7 }}>No takes yet. Hit “Record Take”.</p>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: 8 }}>
            {lane.takes.map(t => (
              <div key={t.id} style={{ background: "#141414", border: "1px solid #2a2a2a", borderRadius: 10, padding: 10, display: "flex", gap: 10, alignItems: "center" }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 700 }}>{t.name}{lane.activeTakeId === t.id ? " (active)" : ""}</div>
                  <div style={{ opacity: 0.7, fontSize: 12 }}>{new Date(t.createdAt).toLocaleString()}</div>
                  <audio controls src={t.blobUrl} style={{ width: "100%", marginTop: 6 }} />
                </div>
                <button onClick={() => selectTake(t.id)}>Set Active + Comp</button>
              </div>
            ))}
          </div>
        )}
        {comp.segments.length ? (
          <p style={{ opacity: 0.7, marginTop: 8 }}>
            Comp v1: using full active take ({comp.segments[0].takeId}). Next: real region comping on timeline.
          </p>
        ) : null}
      </div>
    </div>
  );
}
