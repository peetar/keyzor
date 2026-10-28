import { NextResponse } from "next/server";
import { removeProjectCollaborator } from "@/lib/services/lifecycle-service";
import { resolveCaller } from "@/lib/api/auth-helper";

export async function DELETE(
  req: Request,
  context: { params: Promise<{ projectSlug: string; userId: string }> }
) {
  try {
    const caller = await resolveCaller(req);
    if (!caller) {
      return NextResponse.json(
        { ok: false, error: "Authentication required. Please sign in or provide a valid Bearer API key." },
        { status: 401 }
      );
    }

    const { projectSlug, userId: targetUserId } = await context.params;
    const result = await removeProjectCollaborator(
      projectSlug,
      targetUserId,
      caller.userId
    );

    return NextResponse.json({
      ok: true,
      data: result,
    });
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: (err as Error).message },
      { status: 403 }
    );
  }
}
