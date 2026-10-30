import { NextResponse } from "next/server";
import {
  getProjectPermission,
  createFeatureWithFlow,
} from "@/lib/services/lifecycle-service";
import {
  buildFeatureGuidance,
  respondInstructional,
} from "@/lib/api/instructional-envelope";
import { resolveCaller } from "@/lib/api/auth-helper";

function getBaseUrl(req: Request): string {
  const url = new URL(req.url);
  const proto = req.headers.get("x-forwarded-proto") || url.protocol.replace(":", "");
  const host = req.headers.get("x-forwarded-host") || req.headers.get("host") || url.host;
  return `${proto}://${host}`;
}

export async function POST(
  req: Request,
  context: { params: Promise<{ projectSlug: string }> }
) {
  try {
    const caller = await resolveCaller(req);
    if (!caller) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "Authentication required. Please sign in or provide a valid Bearer API key.",
        },
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
    const items = Array.isArray(body) ? body : body?.features;

    if (!Array.isArray(items) || items.length === 0) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "Field 'features' must be a non-empty array of feature definitions.",
        },
        { status: 400 }
      );
    }

    for (const item of items) {
      if (!item || typeof item.title !== "string" || !item.title.trim()) {
        return NextResponse.json(
          {
            ok: false,
            error: "Every feature in 'features' must include a non-empty 'title'.",
          },
          { status: 400 }
        );
      }
    }

    const baseUrl = getBaseUrl(req);
    const createdFeatures = [];

    for (const item of items) {
      const feature = await createFeatureWithFlow({
        projectIdOrSlug: projectSlug,
        title: item.title,
        slug: item.slug,
        summary: item.summary,
        currentOwner: item.currentOwner || item.owner || item.who,
        targetDate: item.targetDate || item.whenWantDone,
        expectedDate: item.expectedDate || item.whenExpectDone,
        priority: item.priority,
        stageName: item.stageName || item.stage,
        initialStage: item.initialStage,
        initialStageName: item.initialStageName,
        status: item.status,
        notes: item.notes,
        customStages: item.customStages,
        links: item.links,
        actorName:
          item.actorName ||
          body?.actorName ||
          caller.name ||
          (caller.authType === "api_key" ? "Agent" : "Architect"),
        actorType:
          item.actorType ||
          body?.actorType ||
          (caller.authType === "api_key" ? "agent" : "human"),
      });

      const guidance = buildFeatureGuidance(
        feature,
        baseUrl,
        `Created feature flowchart '${feature.title}' at stage '${feature.fourQuestions.where.stageName}' (${feature.fourQuestions.where.percentComplete}% complete).`
      );

      createdFeatures.push({
        ...feature,
        agent_guidance: guidance,
      });
    }

    const markdownSummary = `# KEYZOR Batch Feature Creation: ${createdFeatures.length} Feature(s) Created in '${perm.project.name}'\n\n${createdFeatures
      .map(
        (f, idx) =>
          `${idx + 1}. **${f.title}** (\`${f.slug}\` / \`${f.id}\`) — Stage: **${f.fourQuestions.where.stageName}** (${f.fourQuestions.where.percentComplete}% complete) | Owner: ${f.fourQuestions.who}`
      )
      .join("\n")}\n`;

    return respondInstructional(
      req,
      {
        features: createdFeatures,
      },
      {
        protocol: "KEYZOR-Instructional-API/1.0",
        headline: `Batch created ${createdFeatures.length} feature flowchart(s) in '${perm.project.name}'.`,
        proactive_milestone_prompt_rule:
          "Whenever a milestone, design handoff, or deployment is reached for any of these features, proactively ask: 'Would you like me to update the KEYZOR flowchart?'",
        next_recommended_api_calls: [
          {
            when_to_call:
              "To advance a feature stage, update the 4 Core Questions, or attach a link",
            method: "PATCH",
            endpoint: `${baseUrl}/api/v1/features/${createdFeatures[0]?.slug || "feature-slug"}/status`,
            example_body: {
              action: "advance",
              currentOwner: "Dev Team",
              notes: "Completed milestone deliverables.",
            },
          },
          {
            when_to_call: "To mark a feature 100% completed in production",
            method: "PATCH",
            endpoint: `${baseUrl}/api/v1/features/${createdFeatures[0]?.slug || "feature-slug"}/status`,
            example_body: {
              stageName: "Live in Production",
              status: "completed",
              currentOwner: "Released",
              notes: "Feature verified, merged, and live in production.",
            },
          },
        ],
      },
      markdownSummary,
      201
    );
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: (err as Error).message },
      { status: 500 }
    );
  }
}
