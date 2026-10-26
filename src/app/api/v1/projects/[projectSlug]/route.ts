import { NextResponse } from "next/server";
import {
  getProjectByIdOrSlug,
  updateProjectShareSettings,
} from "@/lib/services/lifecycle-service";
import { respondInstructional } from "@/lib/api/instructional-envelope";

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
  const { projectSlug } = await context.params;
  const project = await getProjectByIdOrSlug(projectSlug);

  if (!project) {
    return NextResponse.json(
      { ok: false, error: `Project '${projectSlug}' not found.` },
      { status: 404 }
    );
  }

  const baseUrl = getBaseUrl(req);
  return respondInstructional(
    req,
    { project },
    {
      protocol: "KAZOR-Instructional-API/1.0",
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
  const { projectSlug } = await context.params;
  const body = await req.json();

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
}
