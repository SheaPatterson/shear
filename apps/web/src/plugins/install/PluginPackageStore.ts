import { idbPut, idbGet, idbGetAll, idbDelete } from "./idb";

export type StoredFile = { path: string; blob: Blob };

export type PackageIndex = {
  pkgKey: string;
  pluginId: string;
  version: string;
  sha256: string;
  installedAt: string;
  files: string[];
};

function fileKey(pkgKey: string, path: string) {
  return `${pkgKey}::${path}`;
}

export class PluginPackageStore {
  async putPackage(args: { pluginId: string; version: string; sha256: string; files: StoredFile[]; }): Promise<void> {
    const pkgKey = `${args.pluginId}@${args.version}`;
    const installedAt = new Date().toISOString();

    for (const f of args.files) {
      await idbPut("pluginFiles", { k: fileKey(pkgKey, f.path), blob: f.blob });
    }

    const index: PackageIndex = {
      pkgKey,
      pluginId: args.pluginId,
      version: args.version,
      sha256: args.sha256,
      installedAt,
      files: args.files.map(f => f.path)
    };

    await idbPut("pluginIndex", index);
  }

  async getFile(pluginId: string, version: string, path: string): Promise<Blob | null> {
    const pkgKey = `${pluginId}@${version}`;
    const rec = await idbGet<{ k: string; blob: Blob }>("pluginFiles", fileKey(pkgKey, path));
    return rec?.blob ?? null;
  }

  async getIndex(pluginId: string, version: string): Promise<PackageIndex | null> {
    const pkgKey = `${pluginId}@${version}`;
    return await idbGet<PackageIndex>("pluginIndex", pkgKey);
  }

  async listInstalled(): Promise<PackageIndex[]> {
    return await idbGetAll<PackageIndex>("pluginIndex");
  }

  async removePackage(pluginId: string, version: string): Promise<void> {
    const idx = await this.getIndex(pluginId, version);
    if (!idx) return;

    for (const path of idx.files) {
      await idbDelete("pluginFiles", `${idx.pkgKey}::${path}`);
    }
    await idbDelete("pluginIndex", idx.pkgKey);
  }
}
