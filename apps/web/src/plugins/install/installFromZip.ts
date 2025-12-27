import { unzipPluginPackage } from "./unzipPluginPackage";
import { mimeForPath } from "./mime";
import { sha256Hex } from "./sha256";
import { parseManifest } from "./readManifest";
import { PluginPackageStore } from "./PluginPackageStore";
import type { InstalledPlugin } from "../registryTypes";

export async function installPluginFromZip(args: { zip: ArrayBuffer | Uint8Array; signedBy: "marketplace" | "dev"; }): Promise<InstalledPlugin> {
  const zipBytes = args.zip instanceof Uint8Array ? args.zip : new Uint8Array(args.zip);
  const sha256 = await sha256Hex(zipBytes);

  const files = unzipPluginPackage(zipBytes);

  const manifestFile = files.find(f => f.path === "manifest.json");
  if (!manifestFile) throw new Error("Plugin zip missing manifest.json");

  const manifestText = new TextDecoder().decode(manifestFile.bytes);
  const manifest = parseManifest(manifestText);

  if (!files.some(f => f.path === "dsp/worklet.js")) throw new Error("Plugin zip missing dsp/worklet.js");

  const uiEntry = manifest.ui.entry.replace(/^\.\/+/, "");
  if (!files.some(f => f.path === uiEntry)) throw new Error(`Plugin zip missing UI entry: ${uiEntry}`);

  const store = new PluginPackageStore();
  const storedFiles = files.map(f => ({ path: f.path, blob: new Blob([f.bytes], { type: mimeForPath(f.path) }) }));
  await store.putPackage({ pluginId: manifest.id, version: manifest.version, sha256, files: storedFiles });

  return { manifest, baseUrl: `plugin://${manifest.id}/${manifest.version}/`, installedAt: new Date().toISOString(), sha256, signedBy: args.signedBy };
}
