import type { CollabMessage, PresenceState } from "@shear/shared";

export class CollabClient {
  private ws: WebSocket | null = null;
  private url: string;
  onMessage?: (msg: any) => void;

  constructor(roomUrl: string) {
    this.url = roomUrl;
  }

  connect() {
    this.ws = new WebSocket(this.url);
    this.ws.onmessage = (ev) => {
      try {
        const msg = JSON.parse(String(ev.data));
        this.onMessage?.(msg);
      } catch {}
    };
  }

  send(msg: CollabMessage) {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return;
    this.ws.send(JSON.stringify(msg));
  }

  updatePresence(state: PresenceState) {
    this.send({ type: "presence:update", state });
  }

  close() { try { this.ws?.close(); } catch {} }
}
