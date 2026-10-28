import { NextResponse } from "next/server";
import {
  getOrCreateProjectInvite,
  rotateProjectInvite,
  authenticateAgentRequest,
} from "@/lib/services/lifecycle-service";
import { auth } from "@/auth";
import { DEFAULT_USER_ID } from "@/db";

function getBaseUrl(req: Request): string {
  const url = new URL(req.url);
  const proto = req.headers.get("x-forwarded-proto") || url.protocol.replace(":", "");
  const host = req.headers.get("x-forwarded-host") || req.headers.get("host") || url.host;
  return `${proto}://${host}`;
}

async function resolveCaller(req: Request): Promise<{ id: string }> {
  const authHeader = req.headers.get("authorization");
  if (authHeader) {
    const agentAuth = await authenticateAgentRequest(authHeader);
    if (agentAuth.valid && agentAuth.userId) {
      return { id: agentAuth.userId };
    }
  }
  const session = await auth();
  if (session?.user?.id) {
    return { id: session.user.id };
  }
  return { id: DEFAULT_USER_ID };
}

export async function GET(
  req: Request,
  context: { params: Promise<{ projectSlug: string }> }
) {
  try {
    const { projectSlug } = await context.params;
    const caller = await resolveCaller(req);
    const invite = await getOrCreateProjectInvite(projectSlug, caller.id);
    const baseUrl = getBaseUrl(req);

    return NextResponse.json({
      ok: true,
      data: {
        code: invite.code,
        joinUrl: `${baseUrl}/join?code=${invite.code}`,
      },
    });
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: (err as Error).message },
      { status: 400 }
    );
  }
}

export async function POST(
  req: Request,
  context: { params: Promise<{ projectSlug: string }> }
) {
  try {
    const { projectSlug } = await context.params;
    const caller = await resolveCaller(req);
    const body = await req.json().catch(() => ({}));

    const invite = body.rotate
      ? await rotateProjectInvite(projectSlug, caller.id)
      : await getOrCreateProjectInvite(projectSlug, caller.id);

    const baseUrl = getBaseUrl(req);
    return NextResponse.json({
      ok: true,
      data: {
        code: invite.code,
        joinUrl: `${baseUrl}/join?code=${invite.code}`,
        rotated: Boolean(body.rotate),
      },
    });
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: (err as Error).message },
      { status: 403 }
    );
  }
}
