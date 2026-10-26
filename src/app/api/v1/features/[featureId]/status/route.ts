import { NextResponse } from "next/server";
import {
  updateFeatureStatus,
  authenticateAgentRequest,
} from "@/lib/services/lifecycle-service";
import {
  buildFeatureGuidance,
  formatFeatureMarkdownForAgent,
  respondInstructional,
} from "@/lib/api/instructional-envelope";

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
    const { featureId } = await context.params;
    const auth = await authenticateAgentRequest(req.headers.get("authorization"));
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
      actorName: body.actorName || (auth.valid ? auth.keyName : "Architect"),
      actorType: body.actorType || (auth.valid ? "agent" : "human"),
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
