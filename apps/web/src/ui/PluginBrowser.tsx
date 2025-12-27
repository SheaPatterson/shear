import { useEffect, useState } from "react";
import { PluginPackageStore } from "../plugins/install/PluginPackageStore";
import { parseManifest } from "../plugins/install/readManifest";
import type { PluginManifest } from "../plugins/types";

type Installed = { pluginId: string; version: string; manifest: PluginManifest };

async function loadManifest(store: PluginPackageStore, pluginId: string, version: string): Promise<PluginManifest> {
  const blob = await store.getFile(pluginId, version, "manifest.json");
  if (!blob) throw new Error("manifest.json missing");
  return parseManifest(await blob.text());
}

export function PluginBrowser(props: {
  onLoadToSlot: (pluginId: string, version: string, manifest: PluginManifest) => void;
}) {
  const [items, setItems] = useState<Installed[]>([]);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const store = new PluginPackageStore();
        const idx = await store.listInstalled();
        const out: Installed[] = [];
        for (const p of idx) {
          const manifest = await loadManifest(store, p.pluginId, p.version);
          out.push({ pluginId: p.pluginId, version: p.version, manifest });
        }
        setItems(out);
      } catch (e: any) {
        setErr(String(e?.message || e));
      }
    })();
  }, []);

  return (
    <div style={{ border: "1px solid #333", borderRadius: 12, padding: 12, marginTop: 12 }}>
      <h3 style={{ margin: 0 }}>Installed Plugins</h3>
      {err ? <p style={{ color: "salmon" }}>{err}</p> : null}
      {items.length === 0 ? <p style={{ opacity: 0.7 }}>No plugins installed yet. Use the installer to add zip packages.</p> : null}

      <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: 8, marginTop: 10 }}>
        {items.map(it => (
          <div key={`${it.pluginId}@${it.version}`} style={{ background: "#141414", border: "1px solid #2a2a2a", borderRadius: 10, padding: 10, display: "flex", gap: 10, alignItems: "center" }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 700 }}>{it.manifest.name}</div>
              <div style={{ opacity: 0.75, fontSize: 12 }}>{it.pluginId} @ {it.version} • {it.manifest.type}</div>
            </div>
            <button onClick={() => props.onLoadToSlot(it.pluginId, it.version, it.manifest)}>Load to selected slot</button>
          </div>
        ))}
      </div>
    </div>
  );
}
