import { NextResponse } from "next/server";
import { joinProjectWithCode } from "@/lib/services/lifecycle-service";
import { resolveCaller } from "@/lib/api/auth-helper";

export async function POST(req: Request) {
  try {
    const caller = await resolveCaller(req);
    if (!caller) {
      return NextResponse.json(
        { ok: false, error: "Authentication required. Please sign in or provide a valid Bearer API key." },
        { status: 401 }
      );
    }

    const body = await req.json();
    const code = (body.code as string)?.trim();

    if (!code) {
      return NextResponse.json(
        { ok: false, error: "Invite code is required." },
        { status: 400 }
      );
    }

    const project = await joinProjectWithCode(code, {
      id: caller.userId,
      name: caller.name || "Collaborator",
      email: caller.email || "",
    });

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
