import type { CollabMessage, PresenceState } from "@shear/shared";

type Env = {
  ROOMS: DurableObjectNamespace;
};

export class ShearRoom implements DurableObject {
  state: DurableObjectState;
  sockets: Set<WebSocket> = new Set();
  presence: Map<string, PresenceState> = new Map();

  constructor(state: DurableObjectState, env: Env) {
    this.state = state;
    // restore state if present
    state.blockConcurrencyWhile(async () => {
      const stored = await state.storage.get<Record<string, PresenceState>>("presence");
      if (stored) {
        for (const [k, v] of Object.entries(stored)) this.presence.set(k, v);
      }
    });
  }

  broadcast(msg: CollabMessage) {
    const data = JSON.stringify(msg);
    for (const ws of this.sockets) {
      try { ws.send(data); } catch {}
    }
  }

  async fetch(request: Request) {
    const url = new URL(request.url);
    // WebSocket upgrade endpoint: /room/<projectId>
    if (request.headers.get("Upgrade") === "websocket") {
      const pair = new WebSocketPair();
      const client = pair[0];
      const server = pair[1];

      server.accept();
      this.sockets.add(server);

      // send current presence snapshot
      server.send(JSON.stringify({ type: "presence:snapshot", states: Array.from(this.presence.values()) }));

      server.addEventListener("message", (evt) => {
        try {
          const msg = JSON.parse(String(evt.data)) as CollabMessage;
          if (msg.type === "presence:update") {
            const s = msg.state;
            this.presence.set(s.userId, s);
            this.state.storage.put("presence", Object.fromEntries(this.presence.entries()));
            this.broadcast(msg);
            return;
          }
          if (msg.type === "ping") {
            server.send(JSON.stringify({ type: "pong", t: msg.t }));
            return;
          }
          // pass-through broadcast for transport/comments/takes
          this.broadcast(msg);
        } catch {
          // ignore
        }
      });

      server.addEventListener("close", () => {
        this.sockets.delete(server);
      });

      return new Response(null, { status: 101, webSocket: client });
    }

    if (url.pathname === "/health") return new Response("ok");
    return new Response("SHEAR Collab Worker. Use WebSocket upgrade.", { status: 200 });
  }
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    // route: /room/<projectId>
    const m = url.pathname.match(/^\/room\/(.+)$/);
    if (m) {
      const projectId = m[1];
      const id = env.ROOMS.idFromName(projectId);
      const stub = env.ROOMS.get(id);
      return stub.fetch(request);
    }
    if (url.pathname === "/health") return new Response("ok");
    return new Response("SHEAR Collab API. Connect WS at /room/<projectId>.", { status: 200 });
  }
};
