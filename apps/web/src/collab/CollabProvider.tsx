import React, { createContext, useContext, useEffect, useMemo, useReducer } from "react";
import { CollabClient } from "./client";
import type { PresenceState } from "@shear/shared";

type CollabSnapshotMsg = { type: "presence:snapshot"; states: PresenceState[] };

type CollabUiState = {
  connected: boolean;
  projectId: string;
  selfUserId: string;
  presence: Record<string, PresenceState>;
  transport: { playing: boolean; bpm: number; timeSec: number } | null;
};

type Action =
  | { type: "connected"; v: boolean }
  | { type: "snapshot"; states: PresenceState[] }
  | { type: "presence"; state: PresenceState }
  | { type: "transport"; playing: boolean; bpm?: number; timeSec: number };

function reducer(s: CollabUiState, a: Action): CollabUiState {
  if (a.type === "connected") return { ...s, connected: a.v };
  if (a.type === "snapshot") {
    const map: Record<string, PresenceState> = {};
    for (const p of a.states) map[p.userId] = p;
    return { ...s, presence: map };
  }
  if (a.type === "presence") {
    return { ...s, presence: { ...s.presence, [a.state.userId]: a.state } };
  }
  if (a.type === "transport") {
    return { ...s, transport: { playing: a.playing, bpm: a.bpm ?? s.transport?.bpm ?? 120, timeSec: a.timeSec } };
  }
  return s;
}

type CollabContextValue = {
  state: CollabUiState;
  setTransport: (playing: boolean, timeSec: number, bpm?: number) => void;
  updatePresence: (patch: Partial<PresenceState>) => void;
};

const CollabContext = createContext<CollabContextValue | null>(null);

function getWsBase(): string {
  // Vite-style env (runtime injected at build time)
  const env = (import.meta as any).env;
  const v = env?.VITE_COLLAB_WS_BASE as string | undefined;
  // default: local worker (wrangler) or any proxy you set up
  return v || "ws://127.0.0.1:8787";
}

function stableId(): string {
  try {
    const key = "shear_user_id";
    const existing = localStorage.getItem(key);
    if (existing) return existing;
    const id = "u_" + Math.random().toString(16).slice(2) + "_" + Date.now().toString(16);
    localStorage.setItem(key, id);
    return id;
  } catch {
    return "u_" + Math.random().toString(16).slice(2);
  }
}

export function CollabProvider(props: { projectId: string; children: React.ReactNode }) {
  const selfUserId = useMemo(() => stableId(), []);
  const [state, dispatch] = useReducer(reducer, {
    connected: false,
    projectId: props.projectId,
    selfUserId,
    presence: {},
    transport: null
  });

  const client = useMemo(() => {
    const ws = `${getWsBase()}/room/${encodeURIComponent(props.projectId)}`;
    return new CollabClient(ws);
  }, [props.projectId]);

  useEffect(() => {
    client.onMessage = (msg: any) => {
      if (!msg) return;
      if ((msg as CollabSnapshotMsg).type === "presence:snapshot") {
        dispatch({ type: "snapshot", states: (msg as CollabSnapshotMsg).states || [] });
        return;
      }
      if (msg.type === "presence:update" && msg.state) {
        dispatch({ type: "presence", state: msg.state as PresenceState });
        return;
      }
      if (msg.type === "transport:set") {
        dispatch({ type: "transport", playing: !!msg.playing, timeSec: Number(msg.timeSec || 0), bpm: msg.bpm ? Number(msg.bpm) : undefined });
        return;
      }
    };
    client.connect();
    dispatch({ type: "connected", v: true });

    // announce presence
    const base: PresenceState = {
      userId: selfUserId,
      displayName: "Guest",
      role: "band",
      updatedAt: Date.now()
    };
    client.updatePresence(base);

    const t = setInterval(() => {
      client.updatePresence({ ...base, updatedAt: Date.now() });
    }, 15000);

    return () => {
      clearInterval(t);
      dispatch({ type: "connected", v: false });
      client.close();
    };
  }, [client, selfUserId]);

  const value: CollabContextValue = {
    state,
    setTransport: (playing, timeSec, bpm) => client.send({ type: "transport:set", playing, timeSec, bpm }),
    updatePresence: (patch) => client.updatePresence({ ...(state.presence[selfUserId] || { userId: selfUserId, updatedAt: Date.now() }), ...patch, userId: selfUserId, updatedAt: Date.now() })
  };

  return <CollabContext.Provider value={value}>{props.children}</CollabContext.Provider>;
}

export function useCollab() {
  const v = useContext(CollabContext);
  if (!v) throw new Error("useCollab must be used inside CollabProvider");
  return v;
}
