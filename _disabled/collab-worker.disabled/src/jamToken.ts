import { SignJWT } from "jose";
type Role = "producer" | "band" | "viewer";
const roomName = (projectId: string) => `jam:${projectId}`;

function grantsFor(role: Role) {
  const canPublish = role === "producer" || role === "band";
  return { video: { room: "", roomJoin: true, canPublish, canSubscribe: true } };
}

export async function mintLiveKitToken(args: {
  env: { LIVEKIT_URL: string; LIVEKIT_API_KEY: string; LIVEKIT_API_SECRET: string };
  projectId: string;
  userId: string;
  role: Role;
  ttlSeconds?: number;
}) {
  const ttl = Math.max(60, Math.min(args.ttlSeconds ?? 3600, 86400));
  const now = Math.floor(Date.now() / 1000);
  const rn = roomName(args.projectId);
  const g = grantsFor(args.role);
  g.video.room = rn;

  const secret = new TextEncoder().encode(args.env.LIVEKIT_API_SECRET);
  const jwt = await new SignJWT({ ...g, metadata: "" })
    .setProtectedHeader({ alg: "HS256", typ: "JWT" })
    .setIssuedAt(now)
    .setNotBefore(now)
    .setExpirationTime(now + ttl)
    .setIssuer(args.env.LIVEKIT_API_KEY)
    .setSubject(args.userId)
    .sign(secret);

  return { url: args.env.LIVEKIT_URL, token: jwt, roomName: rn };
}
