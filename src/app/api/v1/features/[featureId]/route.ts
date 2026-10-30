import { NextResponse } from "next/server";
import {
  getFeatureByIdOrSlug,
  getProjectPermission,
} from "@/lib/services/lifecycle-service";
import {
  buildFeatureGuidance,
  formatFeatureMarkdownForAgent,
  respondInstructional,
} from "@/lib/api/instructional-envelope";
import { resolveCaller } from "@/lib/api/auth-helper";
import {
  PATCH as patchFeatureStatus,
  POST as postFeatureStatus,
} from "./status/route";

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

  const baseUrl = getBaseUrl(req);
  const guidance = buildFeatureGuidance(
    feature,
    baseUrl,
    `Loaded feature '${feature.title}' — currently in '${feature.fourQuestions.where.stageName}'.`
  );
  const md = formatFeatureMarkdownForAgent(feature, guidance);

  return respondInstructional(req, { feature }, guidance, md);
}

export async function PATCH(
  req: Request,
  context: { params: Promise<{ featureId: string }> }
) {
  return patchFeatureStatus(req, context);
}

export async function POST(
  req: Request,
  context: { params: Promise<{ featureId: string }> }
) {
  return postFeatureStatus(req, context);
}

