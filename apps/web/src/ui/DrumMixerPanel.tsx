import { useState } from "react";
import type { DrumTrackController } from "../engine/DrumTrackController";
import type { StemId } from "../engine/DrumStemMixer";
import { DrumStemFxPanel } from "./DrumStemFxPanel";

export function DrumMixerPanel(props: { drums: DrumTrackController }) {
  const [_, rerender] = useState(0);
  const [fxStem, setFxStem] = useState<StemId>("kick");

  function setGain(id: StemId, v: number) {
    props.drums.gain(id, v);
    rerender(x => x + 1);
  }
  function setPan(id: StemId, v: number) {
    props.drums.pan(id, v);
    rerender(x => x + 1);
  }
  function toggleMute(id: StemId) {
    const ch = props.drums.stems().find(c => c.id === id)!;
    props.drums.mute(id, !ch.mute);
    rerender(x => x + 1);
  }
  function toggleSolo(id: StemId) {
    const ch = props.drums.stems().find(c => c.id === id)!;
    props.drums.solo(id, !ch.solo);
    rerender(x => x + 1);
  }

  return (
    <div style={{ border: "1px solid #333", borderRadius: 12, padding: 12, marginTop: 12 }}>
      <h3 style={{ margin: 0 }}>Drum Mixer (Stems)</h3>
      <p style={{ opacity: 0.7, marginTop: 6 }}>
        Two floor toms enabled: Floor Tom 1 / Floor Tom 2. Click FX to manage inserts per stem.
      </p>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(9, 1fr)", gap: 10, marginTop: 12 }}>
        {props.drums.stems().map(ch => (
          <div key={ch.id} style={{ background: "#141414", border: "1px solid #2a2a2a", borderRadius: 10, padding: 10 }}>
            <div style={{ fontWeight: 800, fontSize: 12 }}>{ch.name}</div>

            <div style={{ display: "flex", gap: 6, marginTop: 8, flexWrap: "wrap" }}>
              <button onClick={() => toggleMute(ch.id)} style={{ opacity: ch.mute ? 1 : 0.7 }}>M</button>
              <button onClick={() => toggleSolo(ch.id)} style={{ opacity: ch.solo ? 1 : 0.7 }}>S</button>
              <button onClick={() => setFxStem(ch.id)} style={{ opacity: fxStem === ch.id ? 1 : 0.75 }}>FX</button>
            </div>

            <div style={{ marginTop: 10, fontSize: 12, opacity: 0.8 }}>Gain</div>
            <input
              type="range"
              min={0}
              max={2}
              step={0.001}
              value={ch.fader.gain.value}
              onChange={(e) => setGain(ch.id, Number(e.target.value))}
              style={{ width: "100%" }}
            />

            <div style={{ marginTop: 10, fontSize: 12, opacity: 0.8 }}>Pan</div>
            <input
              type="range"
              min={-1}
              max={1}
              step={0.001}
              value={ch.panner.pan.value}
              onChange={(e) => setPan(ch.id, Number(e.target.value))}
              style={{ width: "100%" }}
            />
          </div>
        ))}
      </div>

      <DrumStemFxPanel drums={props.drums} stemId={fxStem} />
    </div>
  );
}
