---
name: keyzor-project-tracker
description: Proactively track feature flowcharts, Gantt timelines, stage handoffs (design.md, PRs, prototypes, staging deploys), and the 4 Core Status Questions in KEYZOR. Activate whenever brainstorming new features, finishing architecture docs (design.md), handing work to dev teams, demoing prototypes, opening PRs, or deploying to test/prod.
---

# KEYZOR — AI Agent Skill & Instructional API Guide

Welcome, Coding Agent! You have connected to **KEYZOR** (`https://keyzor.vercel.app`), an AI-native project & feature flowchart tracker built for software architects and agentic developers.

## 1. How to Install This Skill Locally
Save this response (or the section between the `---` frontmatter and the end of this file) as a skill in your environment:
- **Antigravity / Gemini**: `.agent/skills/keyzor/SKILL.md`
- **Claude Code**: `.claude/skills/keyzor/SKILL.md`
- **Cursor**: `.cursor/rules/keyzor.mdc`

---

## 2. Core Philosophy: The 4 Questions & Proactive Milestone Prompts

KEYZOR is intentionally **not** a bloated ticket tracker. It exists to answer **4 Core Questions** for every feature at a glance:
1. **Where is this feature?** (Current stage in the Flowchart / Gantt timeline)
2. **Who is working on it?** (`currentOwner` — e.g. `"CPO"`, `"Lead Architect"`, `"India Dev Team"`, `"Antigravity Agent"`)
3. **When do we want it done?** (`targetDate` in `YYYY-MM-DD`)
4. **When do we expect it to be done?** (`expectedDate` in `YYYY-MM-DD`)

### YOUR PROACTIVE BEHAVIOR RULE (CRITICAL)
As you work with the developer across different hats, **proactively ask**:
> **"Would you like me to update the KEYZOR flowchart?"**

Specifically watch for these 4 developer hats:
1. **CPO / Brainstorming Hat**: When the user says a client/CEO requested a new feature or starts brainstorming scope → Offer to call `POST https://keyzor.vercel.app/api/v1/projects/<projectSlug>/features` to create a new feature flowchart.
2. **Designer / Architect Hat**: When you finish writing or updating a `design.md` or technical spec for handoff to a dev team → Offer to attach the `design.md` link, advance the stage to `Handed Over to Dev`, and update `currentOwner` (e.g., `"India Dev Team"`).
3. **Prototype / Demo Hat**: When a prototype is built or demoed → Offer to update the `Prototype Demo` or `Deployed on Dev/Test` stage and attach the preview URL.
4. **Developer / PR / Bugfix Hat**: When opening a PR, fixing review bugs, or shipping to production → Offer to attach the GitHub PR link, update `expectedDate`, or mark the feature complete.

---

## 3. Authentication

Pass the KEYZOR API Key in the `Authorization` header on write calls (or all calls):
```http
Authorization: Bearer kz_live_demo_architect_2026
Content-Type: application/json
```

---

## 4. Active Projects on This KEYZOR Instance
- **Enterprise Cloud Platform v2** (slug: `enterprise-cloud-v2`, id: `proj_core_platform`) — 3 features tracked
- **OnehealthEHR** (slug: `onehealthehr`, id: `proj_7d60feb8c5`) — 0 features tracked
- **Keyzor product roadmap** (slug: `keyzor-product-roadmap`, id: `proj_75b718ab0f`) — 0 features tracked

---

## 5. Instructional API Endpoints Reference

Every endpoint returns an `agent_guidance` envelope telling you the current state of the 4 Core Questions, expectations for the active stage, and the exact payload for your next transition.

### A. List All Projects & Feature Summaries
```bash
curl -s "https://keyzor.vercel.app/api/v1/projects" \
  -H "Authorization: Bearer kz_live_demo_architect_2026"
```

### B. Create a New Feature Flowchart (During Brainstorming or Mini-Project/Bugfix)
You can omit `customStages` to use the project's default 7-stage Architect Lifecycle (`Brainstorming & Scope` → `Architecture & design.md` → `Handed Over to Dev` → `Prototype Demo` → `Deployed on Dev/Test` → `Bugfixes & Feedback` → `Live in Production`), OR pass `customStages` tailored to the feature!

```bash
curl -X POST "https://keyzor.vercel.app/api/v1/projects/enterprise-cloud-v2/features" \
  -H "Authorization: Bearer kz_live_demo_architect_2026" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Customer Usage Export API",
    "summary": "Brainstormed with CEO: CSV/Parquet export endpoint for enterprise billing.",
    "currentOwner": "Lead Architect + Coding Agent",
    "targetDate": "2026-11-15",
    "expectedDate": "2026-11-14",
    "priority": "high",
    "actorName": "Coding Agent"
  }'
```

### C. Advance Stage, Update the 4 Questions, or Attach Links (design.md, GitHub PR, Trello, Preview URL)
Use `PATCH /api/v1/features/<featureIdOrSlug>/status` for all updates:
- Set `"action": "advance"` to move to the next stage in the flowchart.
- Or set `"stageName": "Handed Over to Dev"` to jump to a specific stage by name.
- Or omit `action`/`stageName` to simply update `currentOwner`, `targetDate`, `expectedDate`, `notes`, or attach `links`.

```bash
curl -X PATCH "https://keyzor.vercel.app/api/v1/features/enterprise-sso-saml/status" \
  -H "Authorization: Bearer kz_live_demo_architect_2026" \
  -H "Content-Type: application/json" \
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
```

