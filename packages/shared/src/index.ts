export type UserId = string;
export type ProjectId = string;

export type PresenceState = {
  userId: UserId;
  displayName?: string;
  role?: string;
  trackFocusId?: string;
  transport?: { playing: boolean; bpm: number; bar: number; beat: number; timeSec: number };
  updatedAt: number;
};

export type CollabMessage =
  | { type: "presence:update"; state: PresenceState }
  | { type: "transport:set"; playing: boolean; timeSec: number; bpm?: number }
  | { type: "comment:add"; projectId: ProjectId; bar: number; beat: number; text: string }
  | { type: "take:announce"; projectId: ProjectId; trackId: string; takeId: string; by: UserId }
  | { type: "ping"; t: number }
  | { type: "pong"; t: number };
