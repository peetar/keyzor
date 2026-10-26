import React from "react";
import { signIn, oauthStatus } from "@/auth";
import { redirect } from "next/navigation";
import { Github, Globe, ShieldCheck, Sparkles, ArrowRight } from "lucide-react";

export default function LoginPage() {
  return (
    <div className="min-h-screen bg-[#090D16] text-slate-100 flex items-center justify-center p-6">
      <div className="max-w-md w-full bg-slate-900/90 border border-slate-800 rounded-2xl p-7 shadow-2xl space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="w-11 h-11 rounded-xl bg-sky-500/15 border border-sky-400/40 flex items-center justify-center text-sky-400 font-bold text-lg mx-auto">
            K
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-white">
            Sign in to KAZOR
          </h1>
          <p className="text-xs text-slate-400">
            AI-Native Feature Flowchart &amp; Gantt Dashboard for Software Architects
          </p>
        </div>

        {/* Free OAuth Providers (GitHub & Google) */}
        <div className="space-y-2.5">
          <form
            action={async () => {
              "use server";
              if (oauthStatus.githubConfigured) {
                await signIn("github", { redirectTo: "/" });
              } else {
                await signIn("credentials", {
                  email: "github-architect@kazor.app",
                  role: "Lead Architect (GitHub)",
                  redirectTo: "/",
                });
              }
            }}
          >
            <button
              type="submit"
              className="w-full py-2.5 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs font-semibold text-white flex items-center justify-center gap-2 transition"
            >
              <Github className="w-4 h-4" />
              <span>
                Continue with GitHub OAuth{" "}
                {!oauthStatus.githubConfigured && "(Instant Local Mode)"}
              </span>
            </button>
          </form>

          <form
            action={async () => {
              "use server";
              if (oauthStatus.googleConfigured) {
                await signIn("google", { redirectTo: "/" });
              } else {
                await signIn("credentials", {
                  email: "google-architect@kazor.app",
                  role: "Lead Architect (Google)",
                  redirectTo: "/",
                });
              }
            }}
          >
            <button
              type="submit"
              className="w-full py-2.5 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs font-semibold text-white flex items-center justify-center gap-2 transition"
            >
              <Globe className="w-4 h-4 text-sky-400" />
              <span>
                Continue with Google OAuth{" "}
                {!oauthStatus.googleConfigured && "(Instant Local Mode)"}
              </span>
            </button>
          </form>
        </div>

        <div className="relative flex py-1 items-center">
          <div className="flex-grow border-t border-slate-800"></div>
          <span className="flex-shrink mx-3 text-[11px] font-mono uppercase text-slate-500">
            Or Switch Active Hat
          </span>
          <div className="flex-grow border-t border-slate-800"></div>
        </div>

        {/* Direct Architect / Role Switcher Form */}
        <form
          action={async (formData: FormData) => {
            "use server";
            const email =
              (formData.get("email") as string) || "architect@kazor.app";
            const role =
              (formData.get("role") as string) || "Lead Architect (CPO / Dev)";
            await signIn("credentials", {
              email,
              role,
              redirectTo: "/",
            });
          }}
          className="space-y-3.5"
        >
          <div>
            <label className="block text-xs font-mono uppercase text-slate-400 mb-1">
              Architect Email
            </label>
            <input
              name="email"
              type="email"
              defaultValue="architect@kazor.app"
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white"
            />
          </div>

          <div>
            <label className="block text-xs font-mono uppercase text-slate-400 mb-1">
              Current Hat / Display Role
            </label>
            <select
              name="role"
              defaultValue="Lead Architect (All Hats)"
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white"
            >
              <option value="Lead Architect (All Hats)">
                Lead Architect (All Hats)
              </option>
              <option value="CPO (Brainstorming Hat)">
                CPO (Client / CEO Brainstorming Hat)
              </option>
              <option value="Architect (design.md Handoff Hat)">
                Architect (design.md Handoff Hat)
              </option>
              <option value="Developer (PR & Bugfix Hat)">
                Developer (PR &amp; Bugfix Hat)
              </option>
            </select>
          </div>

          <button
            type="submit"
            className="w-full py-2.5 px-4 rounded-xl bg-sky-500 hover:bg-sky-400 text-slate-950 font-semibold text-xs flex items-center justify-center gap-1.5 transition"
          >
            <span>Enter KAZOR Workspace</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </form>

        {/* OAuth Setup Tip */}
        <div className="p-3 rounded-xl bg-slate-950/90 border border-slate-800/90 text-[11px] text-slate-400 space-y-1">
          <div className="flex items-center gap-1.5 text-slate-300 font-medium">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            <span>Free OAuth Ready (GitHub &amp; Google)</span>
          </div>
          <p>
            Set <code className="text-sky-300 font-mono">AUTH_GITHUB_ID</code> &amp;{" "}
            <code className="text-sky-300 font-mono">AUTH_GITHUB_SECRET</code> in{" "}
            <code className="font-mono">.env</code> or Vercel Environment Variables to enable live GitHub OAuth in production.
          </p>
        </div>
      </div>
    </div>
  );
}
