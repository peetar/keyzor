import { NextResponse } from "next/server";
import { listProjects } from "@/lib/services/lifecycle-service";
import {
  generateKeyzorSkillMarkdown,
  generateSetupInstructionsMarkdown,
} from "@/lib/api/instructional-envelope";

function getBaseUrl(req: Request): string {
  const url = new URL(req.url);
  const proto =
    req.headers.get("x-forwarded-proto") || url.protocol.replace(":", "");
  const host =
    req.headers.get("x-forwarded-host") ||
    req.headers.get("host") ||
    url.host;
  return `${proto}://${host}`;
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const format = url.searchParams.get("format");
  const accept = req.headers.get("accept") || "";
  const userAgent = (req.headers.get("user-agent") || "").toLowerCase();

  const baseUrl = getBaseUrl(req);
  const projects = await listProjects();
  const apiKey = url.searchParams.get("key")?.trim() || "";

  const isBrowserHtmlRequest =
    format === "html" ||
    (!format &&
      accept.includes("text/html") &&
      !userAgent.includes("curl") &&
      !userAgent.includes("wget") &&
      !userAgent.includes("python") &&
      !userAgent.includes("node") &&
      !userAgent.includes("claude") &&
      !userAgent.includes("antigravity"));

  // If no API key was provided in the query params, return helpful setup instructions
  if (!apiKey) {
    const setupMarkdown = generateSetupInstructionsMarkdown(baseUrl);

    if (format === "json" || accept === "application/json") {
      return NextResponse.json(
        {
          protocol: "KEYZOR-Instructional-API/1.0",
          status: "setup_required",
          message:
            "Welcome to KEYZOR! To connect your AI coding agent, log in, create a project, and query with a valid API key.",
          instructions: {
            step_1: `Log in at ${baseUrl}/login`,
            step_2:
              "Create a new project on your dashboard (if you don't have one yet)",
            step_3:
              "Click 'Agent Skill (/hello)' in the navigation bar to generate your secure random API key",
            step_4: `Query GET ${baseUrl}/hello?format=skill&key=<YOUR_API_KEY> to install your personalized agent skill`,
          },
          dashboard_url: baseUrl,
          login_url: `${baseUrl}/login`,
          setup_markdown: setupMarkdown,
        },
        {
          status: 200,
          headers: {
            "X-Keyzor-Protocol": "KEYZOR-Instructional-API/1.0",
          },
        }
      );
    }

    if (!isBrowserHtmlRequest || format === "skill" || format === "markdown") {
      return new NextResponse(setupMarkdown, {
        status: 200,
        headers: {
          "Content-Type": "text/markdown; charset=utf-8",
          "X-Keyzor-Protocol": "KEYZOR-Instructional-API/1.0",
        },
      });
    }

    // Light-mode HTML instructions for browser visitors without a key
    const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>KEYZOR /hello — Agent Skill Setup</title>
  <script src="https://cdn.tailwindcss.com"></script>
</head>
<body class="bg-slate-50 text-slate-900 min-h-screen font-sans antialiased p-6">
  <div class="max-w-2xl mx-auto my-12 bg-white border border-slate-200 rounded-2xl shadow-sm p-8 space-y-6">
    <div class="flex items-center gap-3">
      <div class="w-10 h-10 rounded-xl bg-indigo-50 border border-indigo-200 flex items-center justify-center text-indigo-600 font-bold text-lg">
        K
      </div>
      <div>
        <h1 class="text-xl font-bold text-slate-900">KEYZOR Agent Protocol</h1>
        <p class="text-xs text-slate-500 font-mono">GET /hello • Setup Required</p>
      </div>
    </div>

    <div class="p-4 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs leading-relaxed space-y-1">
      <div class="font-bold">No API Key Provided</div>
      <p>To connect your AI coding agent (Antigravity, Cursor, Claude Code), follow the 3 quick steps below to generate your personalized key.</p>
    </div>

    <ol class="space-y-4 text-xs text-slate-700">
      <li class="flex items-start gap-3">
        <span class="w-6 h-6 rounded-full bg-indigo-100 text-indigo-700 font-bold flex items-center justify-center shrink-0">1</span>
        <div>
          <strong class="text-slate-900">Log In:</strong> Sign in with your GitHub account to access your workspace.
        </div>
      </li>
      <li class="flex items-start gap-3">
        <span class="w-6 h-6 rounded-full bg-indigo-100 text-indigo-700 font-bold flex items-center justify-center shrink-0">2</span>
        <div>
          <strong class="text-slate-900">Create a Project:</strong> If you don't have one yet, click &ldquo;Create Project&rdquo; on the homepage.
        </div>
      </li>
      <li class="flex items-start gap-3">
        <span class="w-6 h-6 rounded-full bg-indigo-100 text-indigo-700 font-bold flex items-center justify-center shrink-0">3</span>
        <div>
          <strong class="text-slate-900">Generate Agent Key &amp; Query:</strong> Click &ldquo;Agent Skill (/hello)&rdquo; on the top navigation bar to generate your secure random key, then query with your key.
        </div>
      </li>
    </ol>

    <div class="pt-4 border-t border-slate-200 flex items-center justify-between">
      <a href="/" class="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-xs transition">
        Go to Dashboard &amp; Generate Key
      </a>
      <a href="/login" class="text-xs text-slate-500 hover:text-slate-800 font-medium">
        Sign In →
      </a>
    </div>
  </div>
</body>
</html>`;

    return new NextResponse(html, {
      status: 200,
      headers: {
        "Content-Type": "text/html; charset=utf-8",
        "X-Keyzor-Protocol": "KEYZOR-Instructional-API/1.0",
      },
    });
  }

  // Key was provided: generate personalized skill markdown
  const skillMarkdown = generateKeyzorSkillMarkdown(baseUrl, projects, apiKey);

  if (format === "json" || accept === "application/json") {
    return NextResponse.json(
      {
        protocol: "KEYZOR-Instructional-API/1.0",
        welcome:
          "Welcome to KEYZOR! This endpoint provides everything an AI coding agent needs to build a local KEYZOR skill and track feature flowcharts.",
        recommended_action_for_agent:
          "Save the `skill_markdown` field below to `.agent/skills/keyzor/SKILL.md` (or `.claude/skills/keyzor/SKILL.md`), then query `GET /api/v1/projects`.",
        four_core_questions: [
          "1. Where is this feature? (currentStageId / stageName)",
          "2. Who is working on it? (currentOwner)",
          "3. When do we want it done? (targetDate YYYY-MM-DD)",
          "4. When do we expect it to be done? (expectedDate YYYY-MM-DD)",
        ],
        active_projects: projects.map((p) => ({
          id: p.id,
          slug: p.slug,
          name: p.name,
          feature_count: p.features.length,
        })),
        skill_markdown: skillMarkdown,
      },
      {
        headers: {
          "X-Keyzor-Protocol": "KEYZOR-Instructional-API/1.0",
        },
      }
    );
  }

  if (!isBrowserHtmlRequest || format === "skill" || format === "markdown") {
    return new NextResponse(skillMarkdown, {
      status: 200,
      headers: {
        "Content-Type": "text/markdown; charset=utf-8",
        "X-Keyzor-Protocol": "KEYZOR-Instructional-API/1.0",
      },
    });
  }

  // Browser HTML view with valid key
  const escapedSkill = skillMarkdown
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>KEYZOR /hello — Agent Skill &amp; Instructional API</title>
  <script src="https://cdn.tailwindcss.com"></script>
</head>
<body class="bg-slate-50 text-slate-900 min-h-screen font-sans antialiased">
  <div class="max-w-4xl mx-auto px-6 py-10">
    <div class="flex items-center justify-between border-b border-slate-200 pb-6 mb-8">
      <div>
        <div class="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-50 border border-indigo-200 text-indigo-700 text-xs font-mono mb-3">
          GET /hello • AUDIENCE-AWARE ENDPOINT
        </div>
        <h1 class="text-2xl font-bold tracking-tight text-slate-900">KEYZOR Instructional Agent Protocol</h1>
        <p class="text-slate-500 mt-1 text-sm">
          You are viewing the browser preview. When your AI coding agent fetches <code class="text-indigo-600">${baseUrl}/hello?key=...</code>, it receives the raw <code class="text-emerald-700">SKILL.md</code> payload.
        </p>
      </div>
      <a href="/" class="px-4 py-2 rounded-xl bg-white hover:bg-slate-50 text-slate-700 text-sm font-medium border border-slate-300 shadow-2xs transition">
        ← Back to Dashboard
      </a>
    </div>

    <div class="bg-white border border-slate-200 rounded-2xl p-6 mb-8 shadow-xs">
      <h2 class="text-sm font-semibold uppercase tracking-wider text-indigo-600 mb-2">
        1-Click Prompt to Onboard Your AI Coding Agent
      </h2>
      <p class="text-xs text-slate-500 mb-3">
        Paste this instruction into Antigravity, Claude Code, Cursor, or Windsurf:
      </p>
      <div class="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center bg-slate-50 border border-slate-200 rounded-xl p-3">
        <code id="agent-prompt" class="text-xs text-emerald-800 font-mono flex-1 break-all">Fetch ${baseUrl}/hello?format=skill&key=${apiKey} and save the returned instructions as your KEYZOR skill (SKILL.md). Then show me the current status of our projects.</code>
        <button onclick="navigator.clipboard.writeText(document.getElementById('agent-prompt').innerText); this.innerText='Copied!'; setTimeout(()=>this.innerText='Copy Agent Prompt', 2000);" class="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs whitespace-nowrap shadow-xs transition">
          Copy Agent Prompt
        </button>
      </div>
      <div class="flex gap-4 mt-4 text-xs text-slate-500">
        <a href="/hello?format=skill&key=${apiKey}" class="text-indigo-600 hover:underline font-mono">View Raw Agent Markdown (?format=skill)</a>
        <span>•</span>
        <a href="/hello?format=json&key=${apiKey}" class="text-indigo-600 hover:underline font-mono">View Structured JSON (?format=json)</a>
      </div>
    </div>

    <div class="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-xs">
      <div class="px-5 py-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
        <span class="text-xs font-mono text-slate-700 font-semibold">Auto-Generated SKILL.md Payload</span>
        <button onclick="navigator.clipboard.writeText(document.getElementById('raw-skill').innerText); this.innerText='Copied SKILL.md!'; setTimeout(()=>this.innerText='Copy SKILL.md', 2000);" class="px-3 py-1 rounded-lg bg-white hover:bg-slate-50 text-xs text-slate-700 font-medium border border-slate-300 shadow-2xs">
          Copy SKILL.md
        </button>
      </div>
      <pre id="raw-skill" class="p-5 text-xs font-mono text-slate-800 overflow-x-auto leading-relaxed whitespace-pre-wrap">${escapedSkill}</pre>
    </div>
  </div>
</body>
</html>`;

  return new NextResponse(html, {
    status: 200,
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "X-Keyzor-Protocol": "KEYZOR-Instructional-API/1.0",
    },
  });
}
