import { NextResponse } from "next/server";
import {
  reviewProjectAccessRequest,
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

export async function PATCH(
  req: Request,
  context: { params: Promise<{ projectSlug: string; requestId: string }> }
) {
  try {
    const { requestId } = await context.params;
    const body = await req.json();
    const action = body.status as "approved" | "rejected";

    if (action !== "approved" && action !== "rejected") {
      return NextResponse.json(
        { ok: false, error: "Status must be 'approved' or 'rejected'." },
        { status: 400 }
      );
    }

    const caller = await resolveCaller(req);
    const result = await reviewProjectAccessRequest(
      requestId,
      action,
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
