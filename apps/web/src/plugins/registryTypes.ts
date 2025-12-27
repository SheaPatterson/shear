import type { PluginManifest } from "./types";

export type InstalledPlugin = { manifest: PluginManifest; baseUrl: string; installedAt: string; sha256: string; signedBy?: "marketplace" | "dev"; };
