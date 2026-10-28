import { NextResponse } from "next/server";
import { reviewProjectAccessRequest } from "@/lib/services/lifecycle-service";
import { resolveCaller } from "@/lib/api/auth-helper";

export async function PATCH(
  req: Request,
  context: { params: Promise<{ projectSlug: string; requestId: string }> }
) {
  try {
    const caller = await resolveCaller(req);
    if (!caller) {
      return NextResponse.json(
        { ok: false, error: "Authentication required. Please sign in or provide a valid Bearer API key." },
        { status: 401 }
      );
    }

    const { requestId } = await context.params;
    const body = await req.json();
    const action = body.status as "approved" | "rejected";

    if (action !== "approved" && action !== "rejected") {
      return NextResponse.json(
        { ok: false, error: "Status must be 'approved' or 'rejected'." },
        { status: 400 }
      );
    }

    const result = await reviewProjectAccessRequest(
      requestId,
      action,
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
