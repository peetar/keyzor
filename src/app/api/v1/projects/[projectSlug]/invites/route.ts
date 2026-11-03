import { NextResponse } from "next/server";
import {
  getOrCreateProjectInvite,
  rotateProjectInvite,
  deactivateProjectInvite,
  getProjectByIdOrSlug,
  getProjectPermission,
} from "@/lib/services/lifecycle-service";
import { resolveCaller } from "@/lib/api/auth-helper";

function getBaseUrl(req: Request): string {
  const url = new URL(req.url);
  const proto = req.headers.get("x-forwarded-proto") || url.protocol.replace(":", "");
  const host = req.headers.get("x-forwarded-host") || req.headers.get("host") || url.host;
  return `${proto}://${host}`;
}

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
        { ok: false, error: `Project '${projectSlug}' not found.` },
        { status: 404 }
      );
    }
    if (perm.role !== "owner") {
      return NextResponse.json(
        { ok: false, error: "Only the project owner can view invite codes." },
        { status: 403 }
      );
    }

    const project = await getProjectByIdOrSlug(projectSlug, caller.userId);
    const baseUrl = getBaseUrl(req);
    const activeCode = project?.inviteCode || "";

    return NextResponse.json({
      ok: true,
      data: {
        code: activeCode,
        joinUrl: activeCode ? `${baseUrl}/join?code=${activeCode}` : "",
        invites: project?.invites || [],
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
        { ok: false, error: `Project '${projectSlug}' not found.` },
        { status: 404 }
      );
    }
    if (perm.role !== "owner") {
      return NextResponse.json(
        { ok: false, error: "Only the project owner can create or rotate invite codes." },
        { status: 403 }
      );
    }

    const body = await req.json().catch(() => ({}));
    const invite = body.rotate
      ? await rotateProjectInvite(projectSlug, caller.userId, 7)
      : await getOrCreateProjectInvite(projectSlug, caller.userId, 7);

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

export async function DELETE(
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
        { ok: false, error: `Project '${projectSlug}' not found.` },
        { status: 404 }
      );
    }
    if (perm.role !== "owner") {
      return NextResponse.json(
        { ok: false, error: "Only the project owner can deactivate invite codes." },
        { status: 403 }
      );
    }

    const url = new URL(req.url);
    const body = await req.json().catch(() => ({}));
    const inviteId = url.searchParams.get("id") || body.id;

    await deactivateProjectInvite(projectSlug, caller.userId, inviteId);

    return NextResponse.json({
      ok: true,
      message: "Invite code(s) deactivated successfully.",
    });
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: (err as Error).message },
      { status: 403 }
    );
  }
}
