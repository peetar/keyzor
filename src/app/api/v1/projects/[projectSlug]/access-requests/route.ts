import { NextResponse } from "next/server";
import {
  requestProjectAccess,
  getProjectByIdOrSlug,
  authenticateAgentRequest,
} from "@/lib/services/lifecycle-service";
import { auth } from "@/auth";
import { DEFAULT_USER_ID } from "@/db";

async function resolveCaller(req: Request): Promise<{
  id: string;
  name: string;
  email: string;
}> {
  const authHeader = req.headers.get("authorization");
  if (authHeader) {
    const agentAuth = await authenticateAgentRequest(authHeader);
    if (agentAuth.valid && agentAuth.userId) {
      return {
        id: agentAuth.userId,
        name: agentAuth.keyName,
        email: "",
      };
    }
  }
  const session = await auth();
  if (session?.user?.id) {
    return {
      id: session.user.id,
      name: session.user.name || "Software Architect",
      email: session.user.email || "",
    };
  }
  return {
    id: DEFAULT_USER_ID,
    name: "Software Architect",
    email: "architect@keyzor.vercel.app",
  };
}

export async function GET(
  req: Request,
  context: { params: Promise<{ projectSlug: string }> }
) {
  try {
    const { projectSlug } = await context.params;
    const caller = await resolveCaller(req);
    const project = await getProjectByIdOrSlug(projectSlug, caller.id);

    if (!project) {
      return NextResponse.json(
        { ok: false, error: "Project not found." },
        { status: 404 }
      );
    }

    if (project.userRole !== "owner") {
      return NextResponse.json(
        { ok: false, error: "Only the project owner can view access requests." },
        { status: 403 }
      );
    }

    return NextResponse.json({
      ok: true,
      data: {
        pendingRequests: project.pendingRequests || [],
      },
    });
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: (err as Error).message },
      { status: 500 }
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
    const result = await requestProjectAccess(projectSlug, caller);

    return NextResponse.json({
      ok: true,
      data: result,
    });
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: (err as Error).message },
      { status: 400 }
    );
  }
}
