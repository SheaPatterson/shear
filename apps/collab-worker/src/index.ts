import { mintLiveKitToken } from "./jamToken";

export interface Env {
  LIVEKIT_URL: string;
  LIVEKIT_API_KEY: string;
  LIVEKIT_API_SECRET: string;
}

async function resolveUserId(_req: Request): Promise<string | null> {
  // TODO: connect real auth
  return "demo-user";
}

async function resolveRoleForProject(_env: Env, _projectId: string, _userId: string): Promise<"producer"|"band"|"viewer"> {
  // TODO: integrate Step 12 role model
  return "producer";
}

export default {
  async fetch(req: Request, env: Env): Promise<Response> {
    const url = new URL(req.url);

    const jt = url.pathname.match(/^\/jam\/token\/([^/]+)$/);
    if (jt && req.method === "POST") {
      const projectId = jt[1];
      const userId = await resolveUserId(req);
      if (!userId) return new Response("Unauthorized", { status: 401 });

      const role = await resolveRoleForProject(env, projectId, userId);

      const payload = await mintLiveKitToken({
        env: { LIVEKIT_URL: env.LIVEKIT_URL, LIVEKIT_API_KEY: env.LIVEKIT_API_KEY, LIVEKIT_API_SECRET: env.LIVEKIT_API_SECRET },
        projectId,
        userId,
        role,
        ttlSeconds: 3600
      });

      return new Response(JSON.stringify(payload), { headers: { "content-type": "application/json" } });
    }

    return new Response("OK", { status: 200 });
  }
};
