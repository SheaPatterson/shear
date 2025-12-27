# SHEAR (Web DAW) — GitHub-ready Monorepo (Dyad-friendly)

This repo is a **GitHub-ready** and **Dyad-compatible** scaffold for the SHEAR web DAW.

## What’s included
- `apps/web`: React/Vite/TS app shell + Jam Mode modules + Plugin SDK modules
- `apps/collab-worker`: Cloudflare Worker scaffold with LiveKit token endpoint
- `examples/superclipper`: Example AudioWorklet FX plugin package (zip it to install)

## Quick start
```bash
corepack enable
yarn
yarn dev
```

## Run Worker (LiveKit token endpoint)
```bash
yarn worker:dev
```

Update `apps/collab-worker/wrangler.toml` with your LiveKit values.

Generated: Fri Dec 26 22:14:59 2025

---

## Collaboration Worker (optional)

SHEAR’s collaboration layer is designed to run as a Cloudflare Worker + Durable Object.

- Worker package: `packages/collab-worker`
- WebSocket endpoint: `/room/<projectId>`
- Health check: `/health`

### Dev
```bash
yarn
yarn worker:dev
```

### Deploy
```bash
yarn worker:deploy
```

If you don’t want collaboration yet, you can ignore the worker entirely and just run the web app:
```bash
yarn dev
```
