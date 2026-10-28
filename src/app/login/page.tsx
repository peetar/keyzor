import React from "react";
import { auth, signIn, oauthStatus } from "@/auth";
import { redirect } from "next/navigation";
import { Github, Globe, ShieldCheck, Lock } from "lucide-react";

export default async function LoginPage() {
  const session = await auth();
  if (session?.user?.id) {
    redirect("/");
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex items-center justify-center p-6">
      <div className="max-w-md w-full bg-white border border-slate-200/90 rounded-2xl p-8 shadow-xl space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="w-12 h-12 rounded-2xl bg-indigo-50 border border-indigo-200 flex items-center justify-center text-indigo-600 font-bold text-xl mx-auto shadow-xs">
            K
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Sign in to KEYZOR
          </h1>
          <p className="text-xs text-slate-500">
            Secure AI-Native Feature Flowchart &amp; Gantt Dashboard
          </p>
        </div>

        {/* OAuth Authentication Providers */}
        <div className="space-y-3">
          <form
            action={async () => {
              "use server";
              await signIn("github", { redirectTo: "/" });
            }}
          >
            <button
              type="submit"
              disabled={!oauthStatus.githubConfigured}
              className="w-full py-2.5 px-4 rounded-xl bg-slate-900 hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed text-xs font-semibold text-white flex items-center justify-center gap-2 shadow-xs transition"
            >
              <Github className="w-4 h-4" />
              <span>
                Continue with GitHub
                {!oauthStatus.githubConfigured && " (Not Configured)"}
              </span>
            </button>
          </form>

          <form
            action={async () => {
              "use server";
              await signIn("google", { redirectTo: "/" });
            }}
          >
            <button
              type="submit"
              disabled={!oauthStatus.googleConfigured}
              className="w-full py-2.5 px-4 rounded-xl bg-white hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed border border-slate-300 text-xs font-semibold text-slate-700 flex items-center justify-center gap-2 shadow-xs transition"
            >
              <Globe className="w-4 h-4 text-indigo-600" />
              <span>
                Continue with Google
                {!oauthStatus.googleConfigured && " (Not Configured)"}
              </span>
            </button>
          </form>
        </div>

        {/* Security Notice */}
        <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-[11px] text-slate-600 space-y-1.5">
          <div className="flex items-center gap-1.5 text-slate-800 font-semibold">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
            <span>Authenticated Workspace Security</span>
          </div>
          <p className="text-slate-500 leading-relaxed">
            All projects, flowcharts, and Gantt timelines are strictly isolated and accessible only to verified project owners and invited collaborators.
          </p>
        </div>
      </div>
    </div>
  );
}
