import { NextResponse } from "next/server";
import { listProjects } from "@/lib/services/lifecycle-service";
import { DEMO_API_KEY } from "@/db";
import { generateKazorSkillMarkdown } from "@/lib/api/instructional-envelope";

function getBaseUrl(req: Request): string {
  const url = new URL(req.url);
  const proto = req.headers.get("x-forwarded-proto") || url.protocol.replace(":", "");
  const host = req.headers.get("x-forwarded-host") || req.headers.get("host") || url.host;
  return `${proto}://${host}`;
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const format = url.searchParams.get("format");
  const accept = req.headers.get("accept") || "";
  const userAgent = (req.headers.get("user-agent") || "").toLowerCase();

  const baseUrl = getBaseUrl(req);
  const projects = await listProjects();
  const apiKeyHint = url.searchParams.get("key") || DEMO_API_KEY;
  const skillMarkdown = generateKazorSkillMarkdown(baseUrl, projects, apiKeyHint);

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

  if (format === "json" || accept === "application/json") {
    return NextResponse.json(
      {
        protocol: "KAZOR-Instructional-API/1.0",
        welcome:
          "Welcome to KAZOR! This endpoint provides everything an AI coding agent needs to build a local KAZOR skill and track feature flowcharts.",
        recommended_action_for_agent:
          "Save the `skill_markdown` field below to `.agent/skills/kazor/SKILL.md` (or `.claude/skills/kazor/SKILL.md`), then query `GET /api/v1/projects`.",
        four_core_questions: [
          "1. Where is this feature? (currentStageId / stageName)",
          "2. Who is working on it? (currentOwner)",
          "3. When do we want it done? (targetDate YYYY-MM-DD)",
          "4. When do we expect it to be done? (expectedDate YYYY-MM-DD)",
        ],
        proactive_hats: {
          cpo_brainstorming:
            "When brainstorming a new feature with a client/CEO, ask: 'Would you like me to create a new KAZOR flowchart for this feature?'",
          architect_design_md:
            "When finishing design.md for handoff to a dev team, ask: 'Would you like me to attach design.md and advance the KAZOR flowchart to Handed Over to Dev?'",
          prototype_demo:
            "When a prototype is ready for demo or deployed to staging, ask: 'Would you like to update KAZOR and attach the preview URL?'",
          developer_pr_bugfix:
            "When opening a PR or completing bugfixes, ask: 'Would you like to update the KAZOR flowchart with this PR link?'",
        },
        endpoints: {
          hello_skill_markdown: `${baseUrl}/hello?format=skill`,
          list_or_create_projects: `${baseUrl}/api/v1/projects`,
          list_or_create_features: `${baseUrl}/api/v1/projects/{projectSlug}/features`,
          get_feature_details: `${baseUrl}/api/v1/features/{featureIdOrSlug}`,
          update_feature_status_and_stage: `${baseUrl}/api/v1/features/{featureIdOrSlug}/status`,
        },
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
          "X-Kazor-Protocol": "KAZOR-Instructional-API/1.0",
        },
      }
    );
  }

  if (!isBrowserHtmlRequest || format === "skill" || format === "markdown") {
    return new NextResponse(skillMarkdown, {
      status: 200,
      headers: {
        "Content-Type": "text/markdown; charset=utf-8",
        "X-Kazor-Protocol": "KAZOR-Instructional-API/1.0",
      },
    });
  }

  // Human browser view of /hello: provides both human explanation + 1-click copy for AI agents
  const escapedSkill = skillMarkdown
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");

  const html = `<!DOCTYPE html>
<html lang="en" class="dark">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>KAZOR /hello — Agent Skill & Instructional API</title>
  <script src="https://cdn.tailwindcss.com"></script>
</head>
<body class="bg-[#090D16] text-slate-100 min-h-screen font-sans antialiased">
  <div class="max-w-4xl mx-auto px-6 py-10">
    <div class="flex items-center justify-between border-b border-slate-800 pb-6 mb-8">
      <div>
        <div class="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-sky-500/10 border border-sky-500/30 text-sky-400 text-xs font-mono mb-3">
          GET /hello • AUDIENCE-AWARE ENDPOINT
        </div>
        <h1 class="text-3xl font-bold tracking-tight">KAZOR Instructional Agent Protocol</h1>
        <p class="text-slate-400 mt-1 text-sm">
          You are viewing the human-friendly browser view. When an AI coding agent fetches <code class="text-sky-300">${baseUrl}/hello</code>, it receives the raw <code class="text-emerald-300">SKILL.md</code> payload automatically.
        </p>
      </div>
      <a href="/" class="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-sm font-medium border border-slate-700 transition">
        ← Back to Dashboard
      </a>
    </div>

    <div class="bg-slate-900/90 border border-sky-500/30 rounded-xl p-6 mb-8">
      <h2 class="text-sm font-semibold uppercase tracking-wider text-sky-400 mb-2">
        1-Click Prompt to Onboard Your AI Coding Agent
      </h2>
      <p class="text-xs text-slate-400 mb-3">
        Paste this single instruction into Antigravity, Claude Code, Cursor, or Windsurf:
      </p>
      <div class="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center bg-slate-950 border border-slate-800 rounded-lg p-3">
        <code id="agent-prompt" class="text-xs text-emerald-300 font-mono flex-1">Fetch ${baseUrl}/hello?format=skill&key=${apiKeyHint} and save the returned instructions as your KAZOR skill (SKILL.md). Then show me the current status of our projects.</code>
        <button onclick="navigator.clipboard.writeText(document.getElementById('agent-prompt').innerText); this.innerText='Copied!'; setTimeout(()=>this.innerText='Copy Agent Prompt', 2000);" class="px-4 py-2 rounded-lg bg-sky-500 hover:bg-sky-400 text-slate-950 font-semibold text-xs whitespace-nowrap transition">
          Copy Agent Prompt
        </button>
      </div>
      <div class="flex gap-4 mt-4 text-xs text-slate-400">
        <a href="/hello?format=skill" class="text-sky-400 hover:underline font-mono">View Raw Agent Markdown (?format=skill)</a>
        <span>•</span>
        <a href="/hello?format=json" class="text-sky-400 hover:underline font-mono">View Structured JSON (?format=json)</a>
      </div>
    </div>

    <div class="bg-slate-900/60 border border-slate-800 rounded-xl overflow-hidden">
      <div class="px-5 py-3 bg-slate-900 border-b border-slate-800 flex items-center justify-between">
        <span class="text-xs font-mono text-slate-300">Auto-Generated SKILL.md Payload for AI Coding Agents</span>
        <button onclick="navigator.clipboard.writeText(document.getElementById('raw-skill').innerText); this.innerText='Copied SKILL.md!'; setTimeout(()=>this.innerText='Copy SKILL.md', 2000);" class="px-3 py-1 rounded bg-slate-800 hover:bg-slate-700 text-xs text-slate-200 border border-slate-700">
          Copy SKILL.md
        </button>
      </div>
      <pre id="raw-skill" class="p-5 text-xs font-mono text-slate-300 overflow-x-auto leading-relaxed whitespace-pre-wrap">${escapedSkill}</pre>
    </div>
  </div>
</body>
</html>`;

  return new NextResponse(html, {
    status: 200,
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "X-Kazor-Protocol": "KAZOR-Instructional-API/1.0",
    },
  });
}
