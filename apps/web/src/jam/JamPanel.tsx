import React from "react";

/**
 * Stub Jam panel.
 * Later: show LiveKit voice room, realtime “band mode” controls, and latency indicators.
 */
export function JamPanel() {
  return (
    <div style={{ border: "1px solid #333", borderRadius: 12, padding: 12, marginTop: 12 }}>
      <h3 style={{ margin: 0 }}>Jam (Band Mode)</h3>
      <p style={{ opacity: 0.75, marginTop: 6 }}>
        Jam is currently stubbed. The build is unblocked. Next step is wiring LiveKit tokens + room join.
      </p>
    </div>
  );
}
