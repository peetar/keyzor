import React from "react";
import { auth, signIn, oauthStatus } from "@/auth";
import { redirect } from "next/navigation";
import {
  joinProjectWithCode,
  getProjectByIdOrSlug,
} from "@/lib/services/lifecycle-service";
import {
  Users,
  ShieldCheck,
  Github,
  Globe,
  ArrowRight,
  Sparkles,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function JoinProjectPage(props: {
  searchParams: Promise<{ code?: string; error?: string }>;
}) {
  const searchParams = await props.searchParams;
  const code = (searchParams.code || "").trim().toUpperCase();
  const session = await auth();

  // If user is authenticated and has a code, attempt to join automatically
  let autoJoinedProject = null;
  let joinError = searchParams.error || null;

  if (session?.user && code) {
    try {
      const user = {
        id: session.user.id || "",
        name: session.user.name || "Collaborator",
        email: session.user.email || "",
      };
      autoJoinedProject = await joinProjectWithCode(code, user);
      // Successfully joined, redirect to homepage with project loaded
      redirect(`/?project=${autoJoinedProject.id}&joined=1`);
    } catch (err) {
      joinError = (err as Error).message;
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex items-center justify-center p-6 font-sans">
      <div className="max-w-md w-full bg-white border border-slate-200/90 rounded-2xl p-8 shadow-xl space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="w-12 h-12 rounded-2xl bg-indigo-50 border border-indigo-200 flex items-center justify-center text-indigo-600 font-bold text-xl mx-auto shadow-xs">
            <Users className="w-6 h-6 text-indigo-600" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Project Collaboration Invite
          </h1>
          <p className="text-xs text-slate-500">
            You have been invited to collaborate on a KEYZOR project and flowchart.
          </p>
        </div>

        {code && (
          <div className="p-3.5 rounded-xl bg-indigo-50/70 border border-indigo-100 flex items-center justify-between">
            <span className="text-xs font-medium text-indigo-900">Invite Code:</span>
            <span className="font-mono font-bold text-sm tracking-wider text-indigo-700 bg-white px-2.5 py-1 rounded-lg border border-indigo-200">
              {code}
            </span>
          </div>
        )}

        {joinError && (
          <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 flex items-start gap-2.5 text-rose-800 text-xs">
            <AlertCircle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
            <span>{joinError}</span>
          </div>
        )}

        {!session?.user ? (
          <div className="space-y-4">
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-600 text-center">
              Please sign in with your GitHub or Google account to join this project as a collaborator.
            </div>

            <div className="space-y-2.5">
              <form
                action={async () => {
                  "use server";
                  const returnUrl = code ? `/join?code=${code}` : "/";
                  if (oauthStatus.githubConfigured) {
                    await signIn("github", { redirectTo: returnUrl });
                  } else {
                    await signIn("credentials", {
                      email: "github-architect@keyzor.vercel.app",
                      role: "Lead Architect (GitHub)",
                      redirectTo: returnUrl,
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
                    Continue with GitHub{" "}
                    {!oauthStatus.githubConfigured && "(Instant Local Mode)"}
                  </span>
                </button>
              </form>

              <form
                action={async () => {
                  "use server";
                  const returnUrl = code ? `/join?code=${code}` : "/";
                  if (oauthStatus.googleConfigured) {
                    await signIn("google", { redirectTo: returnUrl });
                  } else {
                    await signIn("credentials", {
                      email: "google-architect@keyzor.vercel.app",
                      role: "Lead Architect (Google)",
                      redirectTo: returnUrl,
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
                    Continue with Google{" "}
                    {!oauthStatus.googleConfigured && "(Instant Local Mode)"}
                  </span>
                </button>
              </form>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-800 flex items-center gap-2.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <div>
                Signed in as{" "}
                <span className="font-semibold">{session.user.name || session.user.email}</span>
              </div>
            </div>

            <form
              action={async (formData: FormData) => {
                "use server";
                const inputCode = (formData.get("code") as string)?.trim().toUpperCase() || code;
                if (!inputCode) return;
                try {
                  const s = await auth();
                  if (!s?.user) return;
                  await joinProjectWithCode(inputCode, {
                    id: s.user.id || "",
                    name: s.user.name || "Collaborator",
                    email: s.user.email || "",
                  });
                  redirect("/?joined=1");
                } catch (e) {
                  redirect(`/join?code=${inputCode}&error=${encodeURIComponent((e as Error).message)}`);
                }
              }}
              className="space-y-3"
            >
              {!code && (
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Enter Invite Code:
                  </label>
                  <input
                    type="text"
                    name="code"
                    required
                    placeholder="e.g. KZ-7X9B2"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 uppercase"
                  />
                </div>
              )}
              <button
                type="submit"
                className="w-full py-2.5 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-xs font-semibold text-white flex items-center justify-center gap-2 shadow-sm transition"
              >
                <span>Accept Invite &amp; Open Flowchart</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </form>
          </div>
        )}

        <div className="pt-2 text-center border-t border-slate-100">
          <Link
            href="/"
            className="text-xs font-medium text-indigo-600 hover:text-indigo-700"
          >
            &larr; Return to Dashboard
          </Link>
        </div>
      </div>
    </div>
  );
}
