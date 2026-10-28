import { NextResponse } from "next/server";
import {
  listProjects,
  createProject,
  authenticateAgentRequest,
} from "@/lib/services/lifecycle-service";
import { respondInstructional } from "@/lib/api/instructional-envelope";

function getBaseUrl(req: Request): string {
  const url = new URL(req.url);
  const proto = req.headers.get("x-forwarded-proto") || url.protocol.replace(":", "");
  const host = req.headers.get("x-forwarded-host") || req.headers.get("host") || url.host;
  return `${proto}://${host}`;
}

import { auth as getSessionAuth } from "@/auth";
import { DEFAULT_USER_ID } from "@/db";

async function resolveCaller(req: Request): Promise<{ userId: string }> {
  const authHeader = req.headers.get("authorization");
  if (authHeader) {
    const agentAuth = await authenticateAgentRequest(authHeader);
    if (agentAuth.valid && agentAuth.userId) {
      return { userId: agentAuth.userId };
    }
  }
  const session = await getSessionAuth();
  if (session?.user?.id) {
    return { userId: session.user.id };
  }
  return { userId: DEFAULT_USER_ID };
}

export async function GET(req: Request) {
  const baseUrl = getBaseUrl(req);
  const caller = await resolveCaller(req);
  const projects = await listProjects(caller.userId);

  return respondInstructional(
    req,
    {
      projects: projects.map((p) => ({
        id: p.id,
        slug: p.slug,
        name: p.name,
        description: p.description,
        feature_count: p.features.length,
        features_overview: p.features.map((f) => ({
          id: f.id,
          slug: f.slug,
          title: f.title,
          where_stage: f.fourQuestions.where.stageName,
          who_owner: f.fourQuestions.who,
          when_want_done: f.fourQuestions.whenWantDone,
          when_expect_done: f.fourQuestions.whenExpectDone,
          schedule_health: f.fourQuestions.scheduleHealth,
          schedule_variance_days: f.fourQuestions.scheduleVarianceDays,
        })),
      })),
    },
    {
      protocol: "KEYZOR-Instructional-API/1.0",
      headline: `Loaded ${projects.length} project(s).`,
      proactive_milestone_prompt_rule:
        "When the user starts brainstorming a new feature with a client/CEO or begins a mini-project/bugfix, ask: 'Would you like to create a KEYZOR flowchart for this feature?'",
      next_recommended_api_calls: [
        {
          when_to_call: "To create a new feature flowchart during brainstorming",
          method: "POST",
          endpoint: `${baseUrl}/api/v1/projects/${projects[0]?.slug || "enterprise-cloud-v2"}/features`,
          example_body: {
            title: "New Feature Name",
            summary: "Scope summary from brainstorming",
            currentOwner: "Lead Architect + Coding Agent",
            targetDate: "2026-11-20",
            expectedDate: "2026-11-18",
          },
        },
      ],
    }
  );
}

export async function POST(req: Request) {
  try {
    const auth = await authenticateAgentRequest(req.headers.get("authorization"));
    const body = await req.json();

    if (!body.name || typeof body.name !== "string") {
      return NextResponse.json(
        { ok: false, error: "Field 'name' is required to create a project." },
        { status: 400 }
      );
    }

    const baseUrl = getBaseUrl(req);
    const caller = await resolveCaller(req);
    const project = await createProject({
      name: body.name,
      description: body.description,
      slug: body.slug,
      defaultStages: body.defaultStages,
      ownerId: caller.userId,
      actorName: body.actorName || (auth.valid ? auth.keyName : "Architect"),
      actorType: body.actorType || (auth.valid ? "agent" : "human"),
    });

    return respondInstructional(
      req,
      { project },
      {
        protocol: "KEYZOR-Instructional-API/1.0",
        headline: `Created project '${project.name}' (slug: '${project.slug}').`,
        proactive_milestone_prompt_rule:
          "Now that the project is created, offer to initialize the first feature flowchart as you brainstorm with the user.",
        next_recommended_api_calls: [
          {
            when_to_call: "To add the first feature flowchart to this project",
            method: "POST",
            endpoint: `${baseUrl}/api/v1/projects/${project.slug}/features`,
            example_body: {
              title: "Initial Feature",
              summary: "First milestone flow",
              currentOwner: "Lead Architect",
              targetDate: "2026-11-15",
              expectedDate: "2026-11-15",
            },
          },
        ],
      },
      undefined,
      201
    );
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: (err as Error).message },
      { status: 500 }
    );
  }
}
