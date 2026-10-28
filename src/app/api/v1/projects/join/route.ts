import { NextResponse } from "next/server";
import {
  joinProjectWithCode,
  authenticateAgentRequest,
} from "@/lib/services/lifecycle-service";
import { auth } from "@/auth";
import { DEFAULT_USER_ID } from "@/db";

async function resolveCaller(req: Request): Promise<{
  id: string;
  name: string;
  email: string;
}> {
  const authHeader = req.headers.get("authorization");
  if (authHeader) {
    const agentAuth = await authenticateAgentRequest(authHeader);
    if (agentAuth.valid && agentAuth.userId) {
      return {
        id: agentAuth.userId,
        name: agentAuth.keyName,
        email: "",
      };
    }
  }
  const session = await auth();
  if (session?.user?.id) {
    return {
      id: session.user.id,
      name: session.user.name || "Software Architect",
      email: session.user.email || "",
    };
  }
  return {
    id: DEFAULT_USER_ID,
    name: "Software Architect",
    email: "architect@keyzor.vercel.app",
  };
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const code = (body.code as string)?.trim();

    if (!code) {
      return NextResponse.json(
        { ok: false, error: "Invite code is required." },
        { status: 400 }
      );
    }

    const caller = await resolveCaller(req);
    const project = await joinProjectWithCode(code, caller);

    return NextResponse.json({
      ok: true,
      data: {
        project,
        message: `Successfully joined '${project.name}' as a collaborator.`,
      },
    });
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: (err as Error).message },
      { status: 400 }
    );
  }
}
