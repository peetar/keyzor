import { NextResponse } from "next/server";
import {
  getProjectByIdOrSlug,
  updateProjectShareSettings,
  renameProject,
  deleteProject,
  getProjectPermission,
} from "@/lib/services/lifecycle-service";
import { respondInstructional } from "@/lib/api/instructional-envelope";
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
  const caller = await resolveCaller(req);
  if (!caller) {
    return NextResponse.json(
      { ok: false, error: "Authentication required. Please sign in or provide a valid Bearer API key." },
      { status: 401 }
    );
  }

  const { projectSlug } = await context.params;
  const project = await getProjectByIdOrSlug(projectSlug, caller.userId);

  if (!project) {
    return NextResponse.json(
      { ok: false, error: `Project '${projectSlug}' not found or access denied.` },
      { status: 404 }
    );
  }

  const baseUrl = getBaseUrl(req);
  return respondInstructional(
    req,
    { project },
    {
      protocol: "KEYZOR-Instructional-API/1.0",
      headline: `Project '${project.name}' has ${project.features.length} feature(s).`,
      proactive_milestone_prompt_rule:
        "Ask the user if they want to update any feature's stage, owner, or expected completion date when a milestone is reached.",
      next_recommended_api_calls: [
        {
          when_to_call: "To create a new feature flowchart in this project",
          method: "POST",
          endpoint: `${baseUrl}/api/v1/projects/${project.slug}/features`,
          example_body: {
            title: "Feature Title",
            summary: "Feature description",
            currentOwner: "Architect",
            targetDate: "2026-11-20",
            expectedDate: "2026-11-20",
          },
        },
      ],
    }
  );
}

export async function PATCH(
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
    const body = await req.json();

    // If request contains "name", user is renaming the project (Owner only)
    if (typeof body.name === "string" && body.name.trim()) {
      const renamed = await renameProject(projectSlug, body.name, caller.userId);
      return NextResponse.json({ ok: true, data: { project: renamed } });
    }

    // Share settings update (Owner only)
    const perm = await getProjectPermission(projectSlug, caller.userId);
    if (!perm.project) {
      return NextResponse.json(
        { ok: false, error: `Project '${projectSlug}' not found.` },
        { status: 404 }
      );
    }
    if (perm.role !== "owner") {
      return NextResponse.json(
        { ok: false, error: "Only the project owner can update project settings." },
        { status: 403 }
      );
    }

    const updated = await updateProjectShareSettings(projectSlug, {
      shareEnabled: body.shareEnabled,
      rotateToken: body.rotateToken,
    });

    if (!updated) {
      return NextResponse.json(
        { ok: false, error: `Project '${projectSlug}' not found.` },
        { status: 404 }
      );
    }

    return NextResponse.json({ ok: true, data: { project: updated } });
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
    const result = await deleteProject(projectSlug, caller.userId);
    return NextResponse.json({ ok: true, data: result });
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: (err as Error).message },
      { status: 403 }
    );
  }
}
