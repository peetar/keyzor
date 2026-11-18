import { NextResponse } from "next/server";
import { resolveCaller } from "@/lib/api/auth-helper";
import {
  getFeatureDocumentById,
  getProjectByEncryptedShareToken,
  getProjectPermission,
} from "@/lib/services/lifecycle-service";

export async function GET(
  req: Request,
  context: { params: Promise<{ docId: string }> }
) {
  try {
    const { docId } = await context.params;
    const doc = await getFeatureDocumentById(docId);

    if (!doc) {
      return NextResponse.json(
        { ok: false, error: `Document '${docId}' not found.` },
        { status: 404 }
      );
    }

    const url = new URL(req.url);
    const shareToken =
      url.searchParams.get("shareToken") || req.headers.get("x-share-token");

    let authorized = false;

    if (shareToken) {
      const sharedProject = await getProjectByEncryptedShareToken(shareToken);
      if (sharedProject && sharedProject.id === doc.projectId) {
        authorized = true;
      }
    }

    if (!authorized) {
      const caller = await resolveCaller(req);
      if (!caller) {
        return NextResponse.json(
          {
            ok: false,
            error:
              "Authentication required. Provide a Bearer API key, active session, or valid shareToken.",
          },
          { status: 401 }
        );
      }

      const perm = await getProjectPermission(doc.projectId, caller.userId);
      if (!perm.hasAccess) {
        return NextResponse.json(
          { ok: false, error: "Access denied to the project containing this document." },
          { status: 403 }
        );
      }
    }

    const format = url.searchParams.get("format");
    const accept = req.headers.get("accept") || "";
    const wantsJson =
      format === "json" ||
      (format !== "markdown" &&
        format !== "md" &&
        url.searchParams.get("raw") !== "true" &&
        accept.includes("application/json") &&
        !accept.includes("text/markdown"));

    if (wantsJson) {
      return NextResponse.json({
        ok: true,
        document: doc,
      });
    }

    const safeFilename = doc.filename.replace(/["\r\n]/g, "_");
    return new NextResponse(doc.content, {
      status: 200,
      headers: {
        "Content-Type": "text/markdown; charset=utf-8",
        "Content-Disposition": `inline; filename="${safeFilename}"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: (err as Error).message },
      { status: 500 }
    );
  }
}
