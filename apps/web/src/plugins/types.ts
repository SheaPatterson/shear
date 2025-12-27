export type PluginType = "fx" | "instrument";

export type PluginParam = { id: string; name: string; min: number; max: number; default: number; curve?: "linear" | "log"; unit?: string; };

export type PluginManifest = {
  id: string; name: string; vendor: string; version: string; type: PluginType;
  supports: { audioWorklet: boolean; wasm?: boolean; midi?: boolean };
  io: { inputs: number; outputs: number };
  params: PluginParam[];
  ui: { entry: string; width: number; height: number };
  permissions?: { network?: boolean };
};
