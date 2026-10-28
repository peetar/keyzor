import { auth } from "@/auth";
import { authenticateAgentRequest } from "@/lib/services/lifecycle-service";

export interface ResolvedCaller {
  userId: string;
  name?: string;
  email?: string;
  authType: "session" | "api_key";
}

/**
 * Resolves the authenticated caller from either:
 * 1. Bearer API key in Authorization header (for coding agents)
 * 2. NextAuth cookie session (for browser users)
 *
 * Returns null if the caller is not authenticated.
 * NEVER falls back to any hardcoded or default user.
 */
export async function resolveCaller(req: Request): Promise<ResolvedCaller | null> {
  const authHeader = req.headers.get("authorization");
  if (authHeader) {
    const agentAuth = await authenticateAgentRequest(authHeader);
    if (agentAuth.valid && agentAuth.userId) {
      return {
        userId: agentAuth.userId,
        name: agentAuth.keyName,
        email: "",
        authType: "api_key",
      };
    }
    // Bearer header was provided but is invalid or expired
    return null;
  }

  try {
    const session = await auth();
    if (session?.user?.id) {
      return {
        userId: session.user.id,
        name: session.user.name || undefined,
        email: session.user.email || undefined,
        authType: "session",
      };
    }
  } catch {
    return null;
  }

  return null;
}
