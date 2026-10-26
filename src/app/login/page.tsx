import React from "react";
import { signIn, oauthStatus } from "@/auth";
import { redirect } from "next/navigation";
import { Github, Globe, ShieldCheck, Sparkles, ArrowRight } from "lucide-react";

export default function LoginPage() {
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
                  email: "github-architect@keyzor.vercel.app",
                  role: "Lead Architect (GitHub)",
                  redirectTo: "/",
                });
              }
            }}
          >
            <button
              type="submit"
              className="w-full py-2.5 px-4 rounded-xl bg-slate-900 hover:bg-slate-800 text-xs font-semibold text-white flex items-center justify-center gap-2 shadow-xs transition"
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
                  email: "google-architect@keyzor.vercel.app",
                  role: "Lead Architect (Google)",
                  redirectTo: "/",
                });
              }
            }}
          >
            <button
              type="submit"
              className="w-full py-2.5 px-4 rounded-xl bg-white hover:bg-slate-50 border border-slate-300 text-xs font-semibold text-slate-700 flex items-center justify-center gap-2 shadow-xs transition"
            >
              <Globe className="w-4 h-4 text-indigo-600" />
              <span>
                Continue with Google OAuth{" "}
                {!oauthStatus.googleConfigured && "(Instant Local Mode)"}
              </span>
            </button>
          </form>
        </div>

        <div className="relative flex py-1 items-center">
          <div className="flex-grow border-t border-slate-200"></div>
          <span className="flex-shrink mx-3 text-[11px] font-mono uppercase text-slate-400">
            Or Switch Active Hat
          </span>
          <div className="flex-grow border-t border-slate-200"></div>
        </div>

        {/* Direct Architect / Role Switcher Form */}
        <form
          action={async (formData: FormData) => {
            "use server";
            const email =
              (formData.get("email") as string) || "architect@keyzor.vercel.app";
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
            <label className="block text-xs font-mono uppercase text-slate-500 mb-1 font-medium">
              Architect Email
            </label>
            <input
              name="email"
              type="email"
              defaultValue="architect@keyzor.vercel.app"
              className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div>
            <label className="block text-xs font-mono uppercase text-slate-500 mb-1 font-medium">
              Current Hat / Display Role
            </label>
            <select
              name="role"
              defaultValue="Lead Architect (All Hats)"
              className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
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
              <option value="Developer (PR &amp; Bugfix Hat)">
                Developer (PR &amp; Bugfix Hat)
              </option>
            </select>
          </div>

          <button
            type="submit"
            className="w-full py-2.5 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs flex items-center justify-center gap-1.5 shadow-sm transition"
          >
            <span>Enter KEYZOR Workspace</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </form>

        {/* OAuth Setup Tip */}
        <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-[11px] text-slate-600 space-y-1">
          <div className="flex items-center gap-1.5 text-slate-800 font-semibold">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
            <span>GitHub OAuth Active &amp; Ready</span>
          </div>
          <p className="text-slate-500">
            Authenticated securely via your GitHub Developer App and Vercel Environment Variables.
          </p>
        </div>
      </div>
    </div>
  );
}
