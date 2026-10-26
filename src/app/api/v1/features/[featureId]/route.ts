import { NextResponse } from "next/server";
import { getFeatureByIdOrSlug } from "@/lib/services/lifecycle-service";
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

export async function GET(
  req: Request,
  context: { params: Promise<{ featureId: string }> }
) {
  const { featureId } = await context.params;
  const feature = await getFeatureByIdOrSlug(featureId);

  if (!feature) {
    return NextResponse.json(
      { ok: false, error: `Feature '${featureId}' not found.` },
      { status: 404 }
    );
  }

  const baseUrl = getBaseUrl(req);
  const guidance = buildFeatureGuidance(
    feature,
    baseUrl,
    `Loaded feature '${feature.title}' — currently in '${feature.fourQuestions.where.stageName}'.`
  );
  const md = formatFeatureMarkdownForAgent(feature, guidance);

  return respondInstructional(req, { feature }, guidance, md);
}
