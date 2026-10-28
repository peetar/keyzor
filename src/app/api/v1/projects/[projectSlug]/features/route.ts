import { NextResponse } from "next/server";
import {
  getProjectByIdOrSlug,
  getProjectPermission,
  createFeatureWithFlow,
} from "@/lib/services/lifecycle-service";
import {
  buildFeatureGuidance,
  formatFeatureMarkdownForAgent,
  respondInstructional,
} from "@/lib/api/instructional-envelope";
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
  const perm = await getProjectPermission(projectSlug, caller.userId);
  if (!perm.project) {
    return NextResponse.json(
      { ok: false, error: `Project '${projectSlug}' not found.` },
      { status: 404 }
    );
  }
  if (!perm.hasAccess) {
    return NextResponse.json(
      { ok: false, error: `Access denied to project '${projectSlug}'.` },
      { status: 403 }
    );
  }

  const project = await getProjectByIdOrSlug(projectSlug, caller.userId);
  if (!project) {
    return NextResponse.json(
      { ok: false, error: `Project '${projectSlug}' not found.` },
      { status: 404 }
    );
  }

  const baseUrl = getBaseUrl(req);
  return respondInstructional(
    req,
    {
      project: {
        id: project.id,
        slug: project.slug,
        name: project.name,
      },
      features: project.features,
    },
    {
      protocol: "KEYZOR-Instructional-API/1.0",
      headline: `Listed ${project.features.length} feature(s) in '${project.name}'.`,
      proactive_milestone_prompt_rule:
        "Check the 4 Core Questions for each feature ('where', 'who', 'whenWantDone', 'whenExpectDone'). Offer to advance stages or attach links as work progresses.",
      next_recommended_api_calls: [
        {
          when_to_call: "To advance a feature stage or attach a link (design.md, PR, staging URL)",
          method: "PATCH",
          endpoint: `${baseUrl}/api/v1/features/${project.features[0]?.slug || "feature-slug"}/status`,
          example_body: {
            action: "advance",
            currentOwner: "India Dev Team",
            expectedDate: "2026-11-10",
            notes: "Handed over design.md to dev team.",
            links: [
              {
                label: "Architecture design.md",
                url: "https://github.com/org/repo/blob/main/design.md",
              },
            ],
          },
        },
      ],
    }
  );
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
    if (!perm.hasAccess) {
      return NextResponse.json(
        { ok: false, error: `Access denied to project '${projectSlug}'.` },
        { status: 403 }
      );
    }

    const body = await req.json();

    if (!body.title || typeof body.title !== "string") {
      return NextResponse.json(
        {
          ok: false,
          error:
            "Field 'title' is required when creating a new feature flowchart.",
        },
        { status: 400 }
      );
    }

    const feature = await createFeatureWithFlow({
      projectIdOrSlug: projectSlug,
      title: body.title,
      slug: body.slug,
      summary: body.summary,
      currentOwner: body.currentOwner,
      targetDate: body.targetDate,
      expectedDate: body.expectedDate,
      priority: body.priority,
      initialStageName: body.initialStageName,
      customStages: body.customStages,
      links: body.links,
      actorName: body.actorName || caller.name || (caller.authType === "api_key" ? "Agent" : "Architect"),
      actorType: body.actorType || (caller.authType === "api_key" ? "agent" : "human"),
    });

    const baseUrl = getBaseUrl(req);
    const guidance = buildFeatureGuidance(
      feature,
      baseUrl,
      `Created feature flowchart '${feature.title}' (${feature.stages.length} stages).`
    );
    const md = formatFeatureMarkdownForAgent(feature, guidance);

    return respondInstructional(req, { feature }, guidance, md, 201);
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: (err as Error).message },
      { status: 500 }
    );
  }
}
