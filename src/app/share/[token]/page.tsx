import React from "react";
import { getProjectByEncryptedShareToken } from "@/lib/services/lifecycle-service";
import { StakeholderShareView } from "@/components/stakeholder-share-view";
import { ShieldAlert } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function EncryptedSharePage(context: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await context.params;
  const project = await getProjectByEncryptedShareToken(token);

  if (!project) {
    return (
      <div className="min-h-screen bg-[#090D16] text-slate-100 flex items-center justify-center p-6">
        <div className="max-w-md w-full bg-slate-900 border border-rose-500/40 rounded-2xl p-6 text-center space-y-3">
          <div className="w-12 h-12 rounded-xl bg-rose-500/15 border border-rose-500/30 flex items-center justify-center mx-auto text-rose-400">
            <ShieldAlert className="w-6 h-6" />
          </div>
          <h1 className="text-lg font-bold text-white">
            Invalid or Revoked Encrypted Share Link
          </h1>
          <p className="text-xs text-slate-400 leading-relaxed">
            This stakeholder presentation link could not be decrypted or has been rotated/disabled by the project architect. Please request an updated encrypted share link.
          </p>
        </div>
      </div>
    );
  }

  return <StakeholderShareView project={project} />;
}
