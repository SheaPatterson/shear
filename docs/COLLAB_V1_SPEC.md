# SHEAR Collaboration V1 (Implementation Notes)

This patch implements **C**:
- Build fix for missing `jam/` modules (stubs)
- A working **CollabProvider** wiring using the Durable Object WebSocket worker

## What works now
- Web app builds (Jam stubs included)
- Realtime presence list via Durable Object room
- Project ID derived from URL query param:
  - `?project=<id>` (defaults to `demo-project`)

## Web UI wiring
- `apps/web/src/collab/CollabProvider.tsx`
  - wraps the app
  - connects to `VITE_COLLAB_WS_BASE` (defaults to `ws://127.0.0.1:8787`)
  - joins `/room/<projectId>`
  - publishes presence + receives presence snapshot/updates
- `apps/web/src/ui/CollabStatus.tsx`
  - displays connected state and collaborator list

## Jam (Band Mode) stubs
- `apps/web/src/jam/LiveKitJamProvider.tsx` (no-op)
- `apps/web/src/jam/JamPanel.tsx` (placeholder UI)

### Next: LiveKit integration plan
- Keep LiveKit as a separate “A/V layer”:
  - DO WebSocket = transport + presence + comments + take announcements
  - LiveKit = voice room + optional low-latency monitoring
- Replace stub provider with:
  - token fetch from `apps/collab-worker` (or a dedicated `livekit-token` worker)
  - `<LiveKitRoom token=... serverUrl=...>`

## Running locally
1) Web app
```bash
yarn
yarn dev
```

2) Collab worker (Durable Object)
```bash
yarn worker:dev
```

3) Open two tabs:
- `http://localhost:<vitePort>/?project=band-001`
- `http://localhost:<vitePort>/?project=band-001`

You should see both appear in **Collaboration** panel.

Generated: Sat Dec 27 23:37:57 2025
