import { unzipSync } from "fflate";
export type UnzippedFile = { path: string; bytes: Uint8Array };

function normalizePath(p: string): string {
  let s = p.replace(/\\/g, "/");
  s = s.replace(/^\.\/+/, "");
  s = s.replace(/\/+/, "/");
  const parts: string[] = [];
  for (const seg of s.split("/")) {
    if (!seg || seg === ".") continue;
    if (seg === "..") continue;
    parts.push(seg);
  }
  return parts.join("/");
}

export function unzipPluginPackage(zipBytes: Uint8Array): UnzippedFile[] {
  const entries = unzipSync(zipBytes);
  const out: UnzippedFile[] = [];
  for (const [rawPath, bytes] of Object.entries(entries)) {
    const path = normalizePath(rawPath);
    if (!path || path.endsWith("/")) continue;
    out.push({ path, bytes });
  }
  return out;
}
