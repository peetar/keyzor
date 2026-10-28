import { NextResponse } from "next/server";
import {
  getFeatureByIdOrSlug,
  getProjectPermission,
  updateFeatureStatus,
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

async function handleStatusUpdate(
  req: Request,
  context: { params: Promise<{ featureId: string }> }
) {
  try {
    const caller = await resolveCaller(req);
    if (!caller) {
      return NextResponse.json(
        { ok: false, error: "Authentication required. Please sign in or provide a valid Bearer API key." },
        { status: 401 }
      );
    }

    const { featureId } = await context.params;
    const feature = await getFeatureByIdOrSlug(featureId);

    if (!feature) {
      return NextResponse.json(
        { ok: false, error: `Feature '${featureId}' not found.` },
        { status: 404 }
      );
    }

    const perm = await getProjectPermission(feature.projectId, caller.userId);
    if (!perm.hasAccess) {
      return NextResponse.json(
        { ok: false, error: "Access denied to the project containing this feature." },
        { status: 403 }
      );
    }

    const body = await req.json();

    const updated = await updateFeatureStatus({
      featureIdOrSlug: featureId,
      action: body.action,
      stageId: body.stageId,
      stageName: body.stageName || body.stage,
      currentOwner: body.currentOwner || body.owner || body.who,
      targetDate: body.targetDate || body.whenWantDone,
      expectedDate: body.expectedDate || body.whenExpectDone,
      title: body.title,
      summary: body.summary,
      priority: body.priority,
      status: body.status,
      notes: body.notes,
      plannedStartDate: body.plannedStartDate,
      plannedEndDate: body.plannedEndDate,
      actualStartDate: body.actualStartDate,
      actualEndDate: body.actualEndDate,
      links: body.links,
      actorName: body.actorName || caller.name || (caller.authType === "api_key" ? "Agent" : "Architect"),
      actorType: body.actorType || (caller.authType === "api_key" ? "agent" : "human"),
    });

    const baseUrl = getBaseUrl(req);
    const guidance = buildFeatureGuidance(
      updated,
      baseUrl,
      `Updated '${updated.title}' → Stage: '${updated.fourQuestions.where.stageName}' | Owner: '${updated.fourQuestions.who}'.`
    );
    const md = formatFeatureMarkdownForAgent(updated, guidance);

    return respondInstructional(req, { feature: updated }, guidance, md);
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: (err as Error).message },
      { status: 500 }
    );
  }
}

export async function PATCH(
  req: Request,
  context: { params: Promise<{ featureId: string }> }
) {
  return handleStatusUpdate(req, context);
}

export async function POST(
  req: Request,
  context: { params: Promise<{ featureId: string }> }
) {
  return handleStatusUpdate(req, context);
}
