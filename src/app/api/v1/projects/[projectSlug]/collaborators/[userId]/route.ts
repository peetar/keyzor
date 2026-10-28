import { NextResponse } from "next/server";
import {
  removeProjectCollaborator,
  authenticateAgentRequest,
} from "@/lib/services/lifecycle-service";
import { auth } from "@/auth";
import { DEFAULT_USER_ID } from "@/db";

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

export async function DELETE(
  req: Request,
  context: { params: Promise<{ projectSlug: string; userId: string }> }
) {
  try {
    const { projectSlug, userId: targetUserId } = await context.params;
    const caller = await resolveCaller(req);
    const result = await removeProjectCollaborator(
      projectSlug,
      targetUserId,
      caller.id
    );

    return NextResponse.json({
      ok: true,
      data: result,
    });
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: (err as Error).message },
      { status: 403 }
    );
  }
}
