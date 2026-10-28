import { NextResponse } from "next/server";
import {
  requestProjectAccess,
  getProjectByIdOrSlug,
  getProjectPermission,
} from "@/lib/services/lifecycle-service";
import { resolveCaller } from "@/lib/api/auth-helper";

export async function GET(
  req: Request,
  context: { params: Promise<{ projectSlug: string }> }
) {
  try {
    const caller = await resolveCaller(req);
    if (!caller) {
      return NextResponse.json(
        { ok: false, error: "Authentication required. Please sign in or provide a valid Bearer API key." },
        { status: 401 }
      );
    }

    const { projectSlug } = await context.params;
    const perm = await getProjectPermission(projectSlug, caller.userId);

    if (!perm.project) {
      return NextResponse.json(
        { ok: false, error: "Project not found." },
        { status: 404 }
      );
    }

    if (perm.role !== "owner") {
      return NextResponse.json(
        { ok: false, error: "Only the project owner can view access requests." },
        { status: 403 }
      );
    }

    const project = await getProjectByIdOrSlug(projectSlug, caller.userId);
    return NextResponse.json({
      ok: true,
      data: {
        pendingRequests: project?.pendingRequests || [],
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
    const caller = await resolveCaller(req);
    if (!caller) {
      return NextResponse.json(
        { ok: false, error: "Authentication required. Please sign in or provide a valid Bearer API key." },
        { status: 401 }
      );
    }

    const { projectSlug } = await context.params;
    const result = await requestProjectAccess(projectSlug, {
      id: caller.userId,
      name: caller.name || "Architect",
      email: caller.email || "",
    });

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
