import { PluginUrlResolver } from "../plugins/host/PluginUrlResolver";

const wavCache = new Map<string, AudioBuffer>();

export async function loadPluginWavAsset(args: {
  audioCtx: AudioContext;
  resolver: PluginUrlResolver;
  pluginId: string;
  version: string;
  path: string;
}): Promise<AudioBuffer> {
  const key = `${args.pluginId}@${args.version}:${args.path}`;
  const cached = wavCache.get(key);
  if (cached) return cached;

  const blobUrl = await args.resolver.getBlobUrl(args.pluginId, args.version, args.path);
  const arr = await fetch(blobUrl).then(r => r.arrayBuffer());
  const decoded = await args.audioCtx.decodeAudioData(arr.slice(0));
  wavCache.set(key, decoded);
  return decoded;
}
