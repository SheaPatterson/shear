import { PluginPackageStore } from "../install/PluginPackageStore";

export class PluginUrlResolver {
  private store = new PluginPackageStore();
  private urlCache = new Map<string, string>();

  private cacheKey(pluginId: string, version: string, path: string) {
    return `${pluginId}@${version}:${path}`;
  }

  async getBlobUrl(pluginId: string, version: string, path: string): Promise<string> {
    const cleanPath = path.replace(/^\.\/+/, "");
    const key = this.cacheKey(pluginId, version, cleanPath);

    const cached = this.urlCache.get(key);
    if (cached) return cached;

    const blob = await this.store.getFile(pluginId, version, cleanPath);
    if (!blob) throw new Error(`Plugin file not found: ${cleanPath}`);

    const url = URL.createObjectURL(blob);
    this.urlCache.set(key, url);
    return url;
  }

  revokeAllFor(pluginId: string, version: string) {
    const prefix = `${pluginId}@${version}:`;
    for (const [k, url] of this.urlCache.entries()) {
      if (k.startsWith(prefix)) {
        URL.revokeObjectURL(url);
        this.urlCache.delete(k);
      }
    }
  }

  revokeAll() {
    for (const url of this.urlCache.values()) URL.revokeObjectURL(url);
    this.urlCache.clear();
  }
}
