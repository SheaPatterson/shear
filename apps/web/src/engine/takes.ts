export type Take = {
  id: string;
  createdAt: string;
  blobUrl: string;
  mime: string;
  name: string;
};

export type TakeLane = {
  laneId: string;
  takes: Take[];
  activeTakeId?: string;
};

const KEY_PREFIX = "shear.takelanes.v1:";

function nid() {
  return Math.random().toString(36).slice(2, 10) + "-" + Date.now().toString(36);
}

export function loadTakeLane(projectId: string, laneId = "guitar"): TakeLane {
  try {
    const raw = localStorage.getItem(KEY_PREFIX + projectId + ":" + laneId);
    if (!raw) return { laneId, takes: [] };
    return JSON.parse(raw);
  } catch {
    return { laneId, takes: [] };
  }
}

export function saveTakeLane(projectId: string, lane: TakeLane) {
  localStorage.setItem(KEY_PREFIX + projectId + ":" + lane.laneId, JSON.stringify(lane));
}

export function addTake(projectId: string, laneId: string, blob: Blob, name?: string): TakeLane {
  const lane = loadTakeLane(projectId, laneId);
  const id = nid();
  const url = URL.createObjectURL(blob);
  const take: Take = {
    id,
    createdAt: new Date().toISOString(),
    blobUrl: url,
    mime: blob.type || "audio/webm",
    name: name ?? `Take ${lane.takes.length + 1}`
  };
  lane.takes.unshift(take);
  lane.activeTakeId = take.id;
  saveTakeLane(projectId, lane);
  return lane;
}

export function setActiveTake(projectId: string, laneId: string, takeId: string): TakeLane {
  const lane = loadTakeLane(projectId, laneId);
  lane.activeTakeId = takeId;
  saveTakeLane(projectId, lane);
  return lane;
}

export type CompSegment = { takeId: string; startSec: number; endSec: number };
export type Comp = { laneId: string; segments: CompSegment[] };

const COMP_KEY_PREFIX = "shear.comp.v1:";

export function loadComp(projectId: string, laneId: string): Comp {
  try {
    const raw = localStorage.getItem(COMP_KEY_PREFIX + projectId + ":" + laneId);
    if (!raw) return { laneId, segments: [] };
    return JSON.parse(raw);
  } catch {
    return { laneId, segments: [] };
  }
}

export function saveComp(projectId: string, comp: Comp) {
  localStorage.setItem(COMP_KEY_PREFIX + projectId + ":" + comp.laneId, JSON.stringify(comp));
}

export function setCompSimple(projectId: string, laneId: string, takeId: string): Comp {
  const comp: Comp = { laneId, segments: [{ takeId, startSec: 0, endSec: 99999 }] };
  saveComp(projectId, comp);
  return comp;
}
