import type { PluginManifest } from "../types";
export function parseManifest(jsonText: string): PluginManifest {
  const m = JSON.parse(jsonText);
  if (!m?.id || !m?.name || !m?.vendor || !m?.version) throw new Error("Invalid manifest: missing id/name/vendor/version");
  if (m.type !== "fx" && m.type !== "instrument") throw new Error("Invalid manifest: type must be fx or instrument");
  if (!m.ui?.entry) throw new Error("Invalid manifest: missing ui.entry");
  if (!Array.isArray(m.params)) throw new Error("Invalid manifest: params must be array");
  if (!m.io?.outputs) throw new Error("Invalid manifest: missing io");
  return m as PluginManifest;
}
