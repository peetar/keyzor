import React from "react";
import { redirect } from "next/navigation";
import { ShieldAlert, FileWarning } from "lucide-react";
import { auth } from "@/auth";
import {
  getFeatureByIdOrSlug,
  getFeatureDocumentById,
  getProjectByEncryptedShareToken,
  getProjectPermission,
} from "@/lib/services/lifecycle-service";
import { MarkdownDocViewer } from "@/components/markdown-doc-viewer";

export const dynamic = "force-dynamic";

export default async function HostedDocPage(context: {
  params: Promise<{ docId: string }>;
  searchParams: Promise<{ shareToken?: string }>;
}) {
  const { docId } = await context.params;
  const { shareToken } = await context.searchParams;

  const doc = await getFeatureDocumentById(docId);

  if (!doc) {
    return (
      <div className="min-h-screen bg-slate-50 text-slate-900 flex items-center justify-center p-6">
        <div className="max-w-md w-full bg-white border border-slate-200 rounded-2xl p-6 text-center space-y-3 shadow-xs">
          <div className="w-12 h-12 rounded-xl bg-amber-50 border border-amber-200 flex items-center justify-center mx-auto text-amber-600">
            <FileWarning className="w-6 h-6" />
          </div>
          <h1 className="text-lg font-bold text-slate-900">
            Document Not Found
          </h1>
          <p className="text-xs text-slate-500 leading-relaxed">
            The hosted Markdown document <code className="font-mono">{docId}</code> could not be found or was deleted.
          </p>
        </div>
      </div>
    );
  }

  let authorized = false;

  if (shareToken) {
    const sharedProject = await getProjectByEncryptedShareToken(shareToken);
    if (sharedProject && sharedProject.id === doc.projectId) {
      authorized = true;
    }
  }

  if (!authorized) {
    const session = await auth();
    if (!session?.user?.id) {
      redirect(`/login?callbackUrl=${encodeURIComponent(`/docs/${docId}`)}`);
    }
    const perm = await getProjectPermission(doc.projectId, session.user.id);
    if (!perm.hasAccess) {
      return (
        <div className="min-h-screen bg-slate-50 text-slate-900 flex items-center justify-center p-6">
          <div className="max-w-md w-full bg-white border border-rose-200 rounded-2xl p-6 text-center space-y-3 shadow-xs">
            <div className="w-12 h-12 rounded-xl bg-rose-50 border border-rose-200 flex items-center justify-center mx-auto text-rose-600">
              <ShieldAlert className="w-6 h-6" />
            </div>
            <h1 className="text-lg font-bold text-slate-900">Access Denied</h1>
            <p className="text-xs text-slate-500 leading-relaxed">
              You do not have permission to view this hosted document. Ask the project owner for access or a stakeholder share link.
            </p>
          </div>
        </div>
      );
    }
  }

  const feature = await getFeatureByIdOrSlug(doc.featureId);

  return (
    <MarkdownDocViewer
      doc={doc}
      featureTitle={feature?.title}
      backHref={shareToken ? `/share/${encodeURIComponent(shareToken)}` : undefined}
    />
  );
}
