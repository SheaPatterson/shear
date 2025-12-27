import { useMemo, useState } from "react";
import type { BasicInstrumentController } from "../engine/BasicInstrumentController";

const INSTRUMENTS = [
  { id: "com.shear.synth", name: "SHEAR | Synth" },
  { id: "com.shear.piano", name: "SHEAR | Grand Piano" },
  { id: "com.shear.organ", name: "SHEAR | Organ" },
  { id: "com.shear.keys", name: "SHEAR | Keys" }
] as const;

export function InstrumentsPanel(props: { instruments: BasicInstrumentController; audioCtx: AudioContext }) {
  const [selected, setSelected] = useState(INSTRUMENTS[0].id);
  const [status, setStatus] = useState("Install these plugins from /examples first, then load here.");

  async function load() {
    try {
      await props.audioCtx.resume();
      setStatus("loading…");
      await props.instruments.load(selected, "1.0.0");
      setStatus("loaded");
    } catch (e: any) {
      setStatus(String(e?.message || e));
    }
  }

  const base = 60; // C4
  const keys = useMemo(() => ["C","C#","D","D#","E","F","F#","G","G#","A","A#","B"], []);

  return (
    <div style={{ border: "1px solid #333", borderRadius: 12, padding: 12, marginTop: 12 }}>
      <h3 style={{ margin: 0 }}>Instruments</h3>
      <p style={{ opacity: 0.75, marginTop: 6 }}>
        Separate instrument plugins: Synth, Grand Piano, Organ, Keys. Install each from <code>examples/</code> via your plugin installer.
      </p>

      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
        <label style={{ display: "flex", gap: 6, alignItems: "center" }}>
          Select
          <select value={selected} onChange={(e) => setSelected(e.target.value)}>
            {INSTRUMENTS.map(i => <option key={i.id} value={i.id}>{i.name}</option>)}
          </select>
        </label>
        <button onClick={load}>Load Instrument</button>
        <span style={{ opacity: 0.75 }}>{status}</span>
      </div>

      <div style={{ marginTop: 12, display: "grid", gridTemplateColumns: "repeat(12, 1fr)", gap: 6 }}>
        {keys.map((k, i) => (
          <button
            key={k}
            onMouseDown={() => props.instruments.midi(base + i, 110, true)}
            onMouseUp={() => props.instruments.midi(base + i, 0, false)}
            onMouseLeave={() => props.instruments.midi(base + i, 0, false)}
          >
            {k}
          </button>
        ))}
      </div>
    </div>
  );
}
