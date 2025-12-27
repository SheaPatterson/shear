import type { PluginManifest } from "../plugins/types";
import { PluginUrlResolver } from "../plugins/host/PluginUrlResolver";
import { loadPluginWavAsset } from "./PluginAssetLoader";

type Cab = 0 | 1 | 2;
type Mic = 0 | 1 | 2;

const cabKey = (cab: Cab) => (cab === 0 ? "1x12" : cab === 1 ? "2x12" : "4x12");
const micKey = (mic: Mic) => (mic === 0 ? "dyn" : mic === 1 ? "cond" : "ribbon");

export async function resolveAmpIR(args: {
  audioCtx: AudioContext;
  resolver: PluginUrlResolver;
  manifest: PluginManifest & { assets?: any };
  pluginId: string;
  version: string;
  cab: Cab;
  mic: Mic;
}): Promise<AudioBuffer> {
  const assets = (args.manifest as any).assets?.irs || {};
  const key = `cab_${cabKey(args.cab)}_${micKey(args.mic)}`;
  const path = assets[key];
  if (!path) throw new Error(`Missing IR asset mapping for ${key}`);

  return await loadPluginWavAsset({
    audioCtx: args.audioCtx,
    resolver: args.resolver,
    pluginId: args.pluginId,
    version: args.version,
    path
  });
}
