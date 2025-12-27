import { useEffect, useMemo, useRef, useState } from "react";
import { DrumTrackController } from "../engine/DrumTrackController";

type Lane = { name: string; note: number };
const LANES: Lane[] = [
  { name: "Kick", note: 36 },
  { name: "Snare", note: 38 },
  { name: "HH Closed", note: 42 },
  { name: "HH Open", note: 46 },
  { name: "Tom 1", note: 48 },
  { name: "Tom 2", note: 45 },
  { name: "Floor 1", note: 41 },
  { name: "Floor 2", note: 43 },
  { name: "Crash", note: 49 },
  { name: "Ride", note: 51 }
];

function makeGrid(steps = 16) {
  const g: Record<string, boolean[]> = {};
  for (const l of LANES) g[l.name] = Array.from({ length: steps }, () => false);
  return g;
}

export function DrumEditorPanel(props: { ctx: AudioContext; controller: DrumTrackController; projectId: string; }) {
  const steps = 16;
  const [bpm, setBpm] = useState(120);
  const [playing, setPlaying] = useState(false);
  const [vel, setVel] = useState(110);
  const [grid, setGrid] = useState<Record<string, boolean[]>>(() => {
    const raw = localStorage.getItem(`shear.drumgrid.v1:${props.projectId}`);
    return raw ? JSON.parse(raw) : makeGrid(steps);
  });

  const stepRef = useRef(0);
  const timerRef = useRef<number | null>(null);

  useEffect(() => {
    localStorage.setItem(`shear.drumgrid.v1:${props.projectId}`, JSON.stringify(grid));
  }, [grid, props.projectId]);

  const stepMs = useMemo(() => (60000 / bpm) / 4, [bpm]); // 16ths

  function toggleCell(lane: string, idx: number) {
    setGrid(prev => {
      const next = { ...prev, [lane]: [...prev[lane]] };
      next[lane][idx] = !next[lane][idx];
      return next;
    });
  }

  function stop() {
    setPlaying(false);
    if (timerRef.current) window.clearInterval(timerRef.current);
    timerRef.current = null;
    stepRef.current = 0;
  }

  async function start() {
    await props.ctx.resume();
    setPlaying(true);
    timerRef.current = window.setInterval(() => {
      const s = stepRef.current % steps;
      for (const l of LANES) {
        if (grid[l.name][s]) props.controller.midi(l.note, vel);
      }
      stepRef.current = (s + 1) % steps;
    }, stepMs);
  }

  return (
    <div style={{ border: "1px solid #333", borderRadius: 12, padding: 12, marginTop: 12 }}>
      <div style={{ display: "flex", gap: 12, alignItems: "baseline", flexWrap: "wrap" }}>
        <h3 style={{ margin: 0 }}>Drum Editor</h3>
        <span style={{ opacity: 0.7 }}>Hybrid mode: DAW editor → MIDI → Instrument plugin</span>
      </div>

      <div style={{ marginTop: 10, display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
        <label style={{ display: "flex", gap: 6, alignItems: "center" }}>
          BPM <input type="number" value={bpm} onChange={e => setBpm(Number(e.target.value || 120))} style={{ width: 90 }} />
        </label>
        <label style={{ display: "flex", gap: 6, alignItems: "center" }}>
          Velocity <input type="number" value={vel} onChange={e => setVel(Number(e.target.value || 110))} style={{ width: 90 }} />
        </label>
        {!playing ? <button onClick={start}>Play</button> : <button onClick={stop}>Stop</button>}
        <button onClick={() => setGrid(makeGrid(steps))}>Clear</button>
      </div>

      <div style={{ marginTop: 12, display: "grid", gridTemplateColumns: `140px repeat(${steps}, 1fr)`, gap: 6 }}>
        <div />
        {Array.from({ length: steps }).map((_, i) => (
          <div key={i} style={{ textAlign: "center", opacity: 0.6, fontSize: 12 }}>{i + 1}</div>
        ))}

        {LANES.map(l => (
          <>
            <div key={l.name} style={{ fontWeight: 700, opacity: 0.85 }}>{l.name}</div>
            {grid[l.name].map((on, i) => (
              <button
                key={`${l.name}-${i}`}
                onClick={() => toggleCell(l.name, i)}
                style={{
                  height: 26,
                  borderRadius: 6,
                  border: "1px solid #2a2a2a",
                  background: on ? "#3a3a3a" : "#141414",
                  cursor: "pointer"
                }}
                aria-label={`${l.name} step ${i + 1}`}
              />
            ))}
          </>
        ))}
      </div>

      <p style={{ opacity: 0.65, marginTop: 10 }}>
        Next: real piano-roll timing, per-step velocity, swing, flam/drag, ghost notes, and exporting MIDI clips to the timeline.
      </p>
    </div>
  );
}
