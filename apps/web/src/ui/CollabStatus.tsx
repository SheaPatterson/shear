import React from "react";
import { useCollab } from "../collab/CollabProvider";

export function CollabStatus() {
  const { state } = useCollab();
  const people = Object.values(state.presence).sort((a,b) => (a.displayName||a.userId).localeCompare(b.displayName||b.userId));

  return (
    <div style={{ border: "1px solid #333", borderRadius: 12, padding: 12, marginTop: 12 }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "baseline" }}>
        <h3 style={{ margin: 0 }}>Collaboration</h3>
        <div style={{ opacity: 0.75, fontSize: 12 }}>
          {state.connected ? "connected" : "disconnected"} • project: <code>{state.projectId}</code>
        </div>
      </div>
      <div style={{ marginTop: 8, opacity: 0.75 }}>
        {people.length} collaborator{people.length === 1 ? "" : "s"} online
      </div>

      <div style={{ marginTop: 10, display: "grid", gridTemplateColumns: "1fr", gap: 6 }}>
        {people.map(p => (
          <div key={p.userId} style={{ display: "flex", justifyContent: "space-between", gap: 10, background: "#141414", border: "1px solid #2a2a2a", borderRadius: 10, padding: "8px 10px" }}>
            <div>
              <div style={{ fontWeight: 800 }}>{p.displayName || p.userId}</div>
              <div style={{ opacity: 0.7, fontSize: 12 }}>{p.role || "member"}</div>
            </div>
            <div style={{ opacity: 0.65, fontSize: 12 }}>
              {new Date(p.updatedAt).toLocaleTimeString()}
            </div>
          </div>
        ))}
      </div>

      <p style={{ marginTop: 10, opacity: 0.65 }}>
        Next: wire transport sync + comments into the timeline. This panel proves the realtime room works.
      </p>
    </div>
  );
}
