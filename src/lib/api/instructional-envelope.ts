import { NextResponse } from "next/server";
import { EnrichedFeature, EnrichedProject } from "@/lib/services/lifecycle-service";

export interface AgentGuidanceBlock {
  protocol: "KEYZOR-Instructional-API/1.0";
  headline: string;
  four_questions_snapshot?: {
    "1_where_is_this_feature": string;
    "2_who_is_working_on_it": string;
    "3_when_do_we_want_it_done": string;
    "4_when_do_we_expect_it_done": string;
    schedule_status: string;
  };
  current_stage_instructions?: string;
  proactive_milestone_prompt_rule: string;
  next_recommended_api_calls: Array<{
    when_to_call: string;
    method: string;
    endpoint: string;
    example_body?: Record<string, unknown>;
  }>;
}

export function buildFeatureGuidance(
  feature: EnrichedFeature,
  baseUrl: string,
  actionHeadline: string
): AgentGuidanceBlock {
  const currentStage =
    feature.stages.find((s) => s.id === feature.currentStageId) ||
    feature.stages.find((s) => s.status === "in_progress") ||
    feature.stages[0];

  const currentIdx = feature.stages.findIndex((s) => s.id === currentStage?.id);
  const nextStage =
    currentIdx >= 0 && currentIdx + 1 < feature.stages.length
      ? feature.stages[currentIdx + 1]
      : null;

  const q = feature.fourQuestions;
  const varianceText =
    q.scheduleVarianceDays === null
      ? "Dates not fully set"
      : q.scheduleVarianceDays === 0
      ? "On Track (0d variance)"
      : q.scheduleVarianceDays > 0
      ? `Slipping by +${q.scheduleVarianceDays} days`
      : `${Math.abs(q.scheduleVarianceDays)} days ahead of target`;

  return {
    protocol: "KEYZOR-Instructional-API/1.0",
    headline: actionHeadline,
    four_questions_snapshot: {
      "1_where_is_this_feature": `${q.where.stageName} (Stage ${q.where.stageIndex + 1} of ${q.where.totalStages} — ${q.where.percentComplete}% complete)`,
      "2_who_is_working_on_it": q.who,
      "3_when_do_we_want_it_done": q.whenWantDone || "Not set",
      "4_when_do_we_expect_it_done": q.whenExpectDone || "Not set",
      schedule_status: varianceText,
    },
    current_stage_instructions:
      currentStage?.agentInstructions ||
      "Complete the work for this stage, attach any relevant links (design.md, GitHub PR, staging URL), and advance when ready.",
    proactive_milestone_prompt_rule:
      currentStage?.proactiveTrigger ||
      "Whenever a milestone is reached in the workspace (e.g., finishing design.md, opening a PR, deploying to staging), proactively ask the developer: 'Would you like to update the KEYZOR flowchart?'",
    next_recommended_api_calls: [
      ...(nextStage
        ? [
            {
              when_to_call: `When moving from '${currentStage?.name}' to '${nextStage.name}'`,
              method: "PATCH",
              endpoint: `${baseUrl}/api/v1/features/${feature.id}/status`,
              example_body: {
                action: "advance",
                currentOwner: nextStage.owner || feature.currentOwner,
                expectedDate: feature.expectedDate,
                notes: `Completed ${currentStage?.name}; entering ${nextStage.name}.`,
                links: [
                  {
                    label: "Deliverable / PR / Spec Link",
                    url: "https://github.com/org/repo/pull/123",
                  },
                ],
                actorName: "Coding Agent",
              },
            },
          ]
        : []),
      {
        when_to_call:
          "When attaching a design.md link, GitHub PR, Trello card, or updating Who/When without changing stage",
        method: "PATCH",
        endpoint: `${baseUrl}/api/v1/features/${feature.id}/status`,
        example_body: {
          currentOwner: feature.currentOwner,
          targetDate: feature.targetDate,
          expectedDate: feature.expectedDate,
          notes: "Updated status & attached link",
          links: [
            {
              label: "Architecture design.md",
              url: "https://github.com/org/repo/blob/main/design.md",
              linkType: "design_doc",
            },
          ],
          actorName: "Coding Agent",
        },
      },
    ],
  };
}

export function formatFeatureMarkdownForAgent(
  feature: EnrichedFeature,
  guidance: AgentGuidanceBlock
): string {
  const stageFlow = feature.stages
    .map((s, idx) => {
      const icon =
        s.status === "completed"
          ? "[x]"
          : s.id === feature.currentStageId || s.status === "in_progress"
          ? "[● ACTIVE]"
          : "[ ]";
      return `${idx + 1}. ${icon} **${s.name}** (Owner: ${s.owner || "—"}) ${
        s.actualStartDate ? `[Started: ${s.actualStartDate}]` : ""
      } ${s.actualEndDate ? `[Done: ${s.actualEndDate}]` : ""}`;
    })
    .join("\n");

  const linksMd =
    feature.links.length > 0
      ? feature.links
          .map((l) => `- [${l.label}](${l.url}) (${l.linkType})`)
          .join("\n")
      : "- None attached yet";

  return `# KEYZOR Instructional Response: ${feature.title}
> **Status**: ${guidance.headline}

## The 4 Core Status Questions
- **Where is this feature?**: ${guidance.four_questions_snapshot?.["1_where_is_this_feature"]}
- **Who is working on it?**: ${guidance.four_questions_snapshot?.["2_who_is_working_on_it"]}
- **When do we want it done?**: ${guidance.four_questions_snapshot?.["3_when_do_we_want_it_done"]}
- **When do we expect it done?**: ${guidance.four_questions_snapshot?.["4_when_do_we_expect_it_done"]} (${guidance.four_questions_snapshot?.schedule_status})

## Flowchart Stages
${stageFlow}

## Attached Links
${linksMd}

## Instructions for Coding Agent
- **Current Stage Expectation**: ${guidance.current_stage_instructions}
- **Proactive Milestone Trigger**: ${guidance.proactive_milestone_prompt_rule}

### Next Recommended API Call
\`\`\`bash
curl -X PATCH "${guidance.next_recommended_api_calls[0]?.endpoint}" \\
  -H "Authorization: Bearer <YOUR_KEYZOR_API_KEY>" \\
  -H "Content-Type: application/json" \\
  -d '${JSON.stringify(guidance.next_recommended_api_calls[0]?.example_body, null, 2)}'
\`\`\`
`;
}

export function respondInstructional(
  req: Request,
  data: Record<string, unknown>,
  guidance: AgentGuidanceBlock,
  markdownAlternative?: string,
  status = 200
) {
  const url = new URL(req.url);
  const accept = req.headers.get("accept") || "";
  const format = url.searchParams.get("format");

  if (
    markdownAlternative &&
    (format === "markdown" || accept.includes("text/markdown"))
  ) {
    return new NextResponse(markdownAlternative, {
      status,
      headers: {
        "Content-Type": "text/markdown; charset=utf-8",
        "X-Keyzor-Protocol": "KEYZOR-Instructional-API/1.0",
      },
    });
  }

  return NextResponse.json(
    {
      ok: status >= 200 && status < 300,
      agent_guidance: guidance,
      data,
    },
    {
      status,
      headers: {
        "X-Keyzor-Protocol": "KEYZOR-Instructional-API/1.0",
      },
    }
  );
}

export function generateKeyzorSkillMarkdown(
  baseUrl: string,
  projects: EnrichedProject[],
  sampleApiKeyHint: string
): string {
  const projectListMd =
    projects.length > 0
      ? projects
          .map(
            (p) =>
              `- **${p.name}** (slug: \`${p.slug}\`, id: \`${p.id}\`) — ${p.features.length} features tracked`
          )
          .join("\n")
      : "- No projects created yet. Create one via `POST /api/v1/projects`.";

  return `---
name: keyzor-project-tracker
description: Proactively track feature flowcharts, Gantt timelines, stage handoffs (design.md, PRs, prototypes, staging deploys), and the 4 Core Status Questions in KEYZOR. Activate whenever brainstorming new features, finishing architecture docs (design.md), handing work to dev teams, demoing prototypes, opening PRs, or deploying to test/prod.
---

# KEYZOR — AI Agent Skill & Instructional API Guide

Welcome, Coding Agent! You have connected to **KEYZOR** (\`${baseUrl}\`), an AI-native project & feature flowchart tracker built for software architects and agentic developers.

## 1. How to Install This Skill Locally
Save this response (or the section between the \`---\` frontmatter and the end of this file) as a skill in your environment:
- **Antigravity / Gemini**: \`.agent/skills/keyzor/SKILL.md\`
- **Claude Code**: \`.claude/skills/keyzor/SKILL.md\`
- **Cursor**: \`.cursor/rules/keyzor.mdc\`

---

## 2. Core Philosophy: The 4 Questions & Proactive Milestone Prompts

KEYZOR is intentionally **not** a bloated ticket tracker. It exists to answer **4 Core Questions** for every feature at a glance:
1. **Where is this feature?** (Current stage in the Flowchart / Gantt timeline)
2. **Who is working on it?** (\`currentOwner\` — e.g. \`"CPO"\`, \`"Lead Architect"\`, \`"India Dev Team"\`, \`"Antigravity Agent"\`)
3. **When do we want it done?** (\`targetDate\` in \`YYYY-MM-DD\`)
4. **When do we expect it to be done?** (\`expectedDate\` in \`YYYY-MM-DD\`)

### YOUR PROACTIVE BEHAVIOR RULE (CRITICAL)
As you work with the developer across different hats, **proactively ask**:
> **"Would you like me to update the KEYZOR flowchart?"**

Specifically watch for these 4 developer hats:
1. **CPO / Brainstorming Hat**: When the user says a client/CEO requested a new feature or starts brainstorming scope → Offer to call \`POST ${baseUrl}/api/v1/projects/<projectSlug>/features\` to create a new feature flowchart.
2. **Designer / Architect Hat**: When you finish writing or updating a \`design.md\` or technical spec for handoff to a dev team → Offer to attach the \`design.md\` link, advance the stage to \`Handed Over to Dev\`, and update \`currentOwner\` (e.g., \`"India Dev Team"\`).
3. **Prototype / Demo Hat**: When a prototype is built or demoed → Offer to update the \`Prototype Demo\` or \`Deployed on Dev/Test\` stage and attach the preview URL.
4. **Developer / PR / Bugfix Hat**: When opening a PR, fixing review bugs, or shipping to production → Offer to attach the GitHub PR link, update \`expectedDate\`, or mark the feature complete.

---

## 3. Authentication

Pass the KEYZOR API Key in the \`Authorization\` header on write calls (or all calls):
\`\`\`http
Authorization: Bearer ${sampleApiKeyHint}
Content-Type: application/json
\`\`\`

---

## 4. Active Projects on This KEYZOR Instance
${projectListMd}

---

## 5. Instructional API Endpoints Reference

Every endpoint returns an \`agent_guidance\` envelope telling you the current state of the 4 Core Questions, expectations for the active stage, and the exact payload for your next transition.

### A. List All Projects & Feature Summaries
\`\`\`bash
curl -s "${baseUrl}/api/v1/projects" \\
  -H "Authorization: Bearer ${sampleApiKeyHint}"
\`\`\`

### B. Create a New Feature Flowchart (During Brainstorming or Mini-Project/Bugfix)
You can omit \`customStages\` to use the project's default 7-stage Architect Lifecycle (\`Brainstorming & Scope\` → \`Architecture & design.md\` → \`Handed Over to Dev\` → \`Prototype Demo\` → \`Deployed on Dev/Test\` → \`Bugfixes & Feedback\` → \`Live in Production\`), OR pass \`customStages\` tailored to the feature!

\`\`\`bash
curl -X POST "${baseUrl}/api/v1/projects/enterprise-cloud-v2/features" \\
  -H "Authorization: Bearer ${sampleApiKeyHint}" \\
  -H "Content-Type: application/json" \\
  -d '{
    "title": "Customer Usage Export API",
    "summary": "Brainstormed with CEO: CSV/Parquet export endpoint for enterprise billing.",
    "currentOwner": "Lead Architect + Coding Agent",
    "targetDate": "2026-11-15",
    "expectedDate": "2026-11-14",
    "priority": "high",
    "actorName": "Coding Agent"
  }'
\`\`\`

### C. Advance Stage, Update the 4 Questions, or Attach Links (design.md, GitHub PR, Trello, Preview URL)
Use \`PATCH /api/v1/features/<featureIdOrSlug>/status\` for all updates:
- Set \`"action": "advance"\` to move to the next stage in the flowchart.
- Or set \`"stageName": "Handed Over to Dev"\` to jump to a specific stage by name.
- Or omit \`action\`/\`stageName\` to simply update \`currentOwner\`, \`targetDate\`, \`expectedDate\`, \`notes\`, or attach \`links\`.

\`\`\`bash
curl -X PATCH "${baseUrl}/api/v1/features/enterprise-sso-saml/status" \\
  -H "Authorization: Bearer ${sampleApiKeyHint}" \\
  -H "Content-Type: application/json" \\
  -d '{
    "action": "advance",
    "currentOwner": "India Dev Team",
    "expectedDate": "2026-11-08",
    "notes": "Architecture design.md finalized and delivered to dev team.",
    "links": [
      {
        "label": "Architecture design.md",
        "url": "https://github.com/org/repo/blob/main/design.md",
        "linkType": "design_doc"
      }
    ],
    "actorName": "Coding Agent"
  }'
\`\`\`
`;
}
