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

### YOUR PROACTIVE BEHAVIOR RULES (MANDATORY OPERATIONAL PROTOCOL)

Whenever a milestone, design handoff, deploy, or scope shift occurs, **proactively ask**:
> **"Would you like me to update the KEYZOR flowchart?"**

Follow these 5 specific operational triggers:

1. **Design / Plan / Spec Handoff Trigger (CRITICAL)**:
   - **When**: Whenever you or the user create, edit, or finalize any design doc, architecture specification, RFC, or implementation plan (e.g., `design.md`, `architecture.md`, `plan.md`, `implementation_plan.md`, `spec.md`, OpenAPI contract).
   - **Action**: Proactively ask:
     > *"I see we just created/updated `[filename]`. Would you like me to attach this design doc link to KEYZOR and advance the flowchart to 'Architecture & design.md' (or 'Handed Over to Dev')?"*

2. **Git Push & Deployment Completion Hook (CRITICAL)**:
   - **When**: Before or immediately after executing `git push`, opening a PR (`gh pr create`), or running a deployment command (`vercel --prod`, `npm run deploy`, Docker release).
   - **Action**: Proactively check active KEYZOR features and ask:
     > *"We just pushed/deployed changes. Would you like me to advance [Active Feature Name] to 'Deployed on Dev/Test' or 'Live in Production'?"*

3. **Scope Pivot & Side-Quest Reconciliation**:
   - **When**: When the user requests bugfixes, ad-hoc cleanup, or starts working on tangential tasks while an active feature is in-progress in KEYZOR.
   - **Action**: Prevent context drift by asking:
     > *"Should we bundle this cleanup into [Active Feature Name], or track it as a new feature flowchart in KEYZOR?"*

4. **CPO / Brainstorming Trigger**:
   - **When**: When the user outlines a new feature request or brainstorms scope.
   - **Action**: Ask:
     > *"Would you like me to create a new KEYZOR flowchart for this feature so we can lock in target dates and lifecycle stages?"*

5. **Prototype & Demo Trigger**:
   - **When**: A working prototype is running locally, a preview environment is live, or a demo is scheduled.
   - **Action**: Ask:
     > *"Would you like me to update the 'Prototype Demo' stage in KEYZOR and attach the preview link?"*

---

## 3. Authentication

Pass your registered KEYZOR API Key in the `Authorization` header on all write requests:
```http
Authorization: Bearer kz_live_eXKAXwwzMBuUyOhFgneldyw3
Content-Type: application/json
```

---

## 4. Instructional API Endpoints Reference

Every endpoint returns an `agent_guidance` envelope telling you the current state of the 4 Core Questions, expectations for the active stage, and the exact payload for your next transition.

> **Tip for AI Agents:** You can use either the full ID (`feat_e70bc59839`) or the URL slug (`decouple-screening-from-registration-triage`) interchangeably in all `/api/v1/features/:idOrSlug` routes. Both `PATCH /api/v1/features/:idOrSlug` and `PATCH /api/v1/features/:idOrSlug/status` are supported.

### A. List All Projects & Feature Summaries
```bash
curl -s "https://keyzor.vercel.app/api/v1/projects" \
  -H "Authorization: Bearer kz_live_eXKAXwwzMBuUyOhFgneldyw3"
```

### B. Create a New Feature Flowchart (or Batch-Create Multiple Features)
You can omit `customStages` to use the project's default 7-stage Architect Lifecycle (`Brainstorming & Scope` → `Architecture & design.md` → `Handed Over to Dev` → `Prototype Demo` → `Deployed on Dev/Test` → `Bugfixes & Feedback` → `Live in Production`), OR pass `customStages` tailored to the feature!
You can also pass optional `stageName`, `status` (e.g. `"completed"`), `notes`, and `links` at creation time to initialize a feature directly into an advanced or completed stage without a second request:

```bash
curl -X POST "https://keyzor.vercel.app/api/v1/projects/<projectSlug>/features" \
  -H "Authorization: Bearer kz_live_eXKAXwwzMBuUyOhFgneldyw3" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Customer Usage Export API",
    "summary": "Brainstormed with CEO: CSV/Parquet export endpoint for enterprise billing.",
    "currentOwner": "Lead Architect + Coding Agent",
    "targetDate": "2026-11-15",
    "expectedDate": "2026-11-14",
    "priority": "high",
    "stageName": "Architecture & design.md",
    "notes": "Initial scope and architecture spec drafted.",
    "links": [
      {
        "label": "Implementation Spec",
        "url": "https://github.com/org/repo/blob/main/spec.md",
        "linkType": "design_doc"
      }
    ],
    "actorName": "Coding Agent"
  }'
```

#### Batch Feature Ingestion (`POST /api/v1/projects/<projectSlug>/features/batch`)
To seed a roadmap or create multiple features in a single HTTP request:
```bash
curl -X POST "https://keyzor.vercel.app/api/v1/projects/<projectSlug>/features/batch" \
  -H "Authorization: Bearer kz_live_eXKAXwwzMBuUyOhFgneldyw3" \
  -H "Content-Type: application/json" \
  -d '{
    "features": [
      {
        "title": "Inpatient Module",
        "summary": "Ward bed management and clinical rounding.",
        "stageName": "Bugfixes & Feedback",
        "currentOwner": "QA Team",
        "targetDate": "2026-11-15"
      },
      {
        "title": "Cashier Partial Payments",
        "summary": "Accept fractional payments with dynamic ledger balance tracking.",
        "stageName": "Live in Production",
        "status": "completed",
        "currentOwner": "Released",
        "targetDate": "2026-10-27"
      }
    ],
    "actorName": "Coding Agent"
  }'
```

### C. Advance Stage, Update the 4 Questions, or Attach Links (design.md, GitHub PR, Trello, Preview URL)
Use `PATCH /api/v1/features/<featureIdOrSlug>/status` (or alias `PATCH /api/v1/features/<featureIdOrSlug>`) for all updates:
- Set `"action": "advance"` to move to the next stage in the flowchart.
- Or set `"stageName": "Handed Over to Dev"` to jump to a specific stage by name.
- Or omit `"action"`/`"stageName"` to simply update `currentOwner`, `targetDate`, `expectedDate`, `notes`, or attach `links`.

```bash
curl -X PATCH "https://keyzor.vercel.app/api/v1/features/<featureSlug>/status" \
  -H "Authorization: Bearer kz_live_eXKAXwwzMBuUyOhFgneldyw3" \
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

### Completing a Feature (100% Shipped)
To advance a feature to the final stage and mark it 100% complete:

```bash
curl -X PATCH "https://keyzor.vercel.app/api/v1/features/<featureSlug>/status" \
  -H "Authorization: Bearer kz_live_eXKAXwwzMBuUyOhFgneldyw3" \
  -H "Content-Type: application/json" \
  -d '{
    "stageName": "Live in Production",
    "status": "completed",
    "currentOwner": "Released",
    "notes": "Feature verified, merged, and live in production.",
    "links": [
      {
        "label": "Release / PR Link",
        "url": "https://github.com/org/repo/pull/123",
        "linkType": "pr"
      }
    ],
    "actorName": "Coding Agent"
  }'
```

### D. Zero-Dependency Node.js Helper (PowerShell & Windows Safe)
Inline `curl` with complex JSON payloads often encounters quoting and escaping issues in PowerShell and Windows shells. Use this cross-platform Node.js snippet for flawless execution:

```javascript
// Quick Keyzor API Helper (zero dependencies)
const https = require('https');

function keyzorRequest(method, path, body, apiKey) {
  return new Promise((resolve, reject) => {
    const payload = body ? JSON.stringify(body) : '';
    const req = https.request({
      hostname: 'keyzor.vercel.app',
      path,
      method,
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(payload)
      }
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve(JSON.parse(data)));
    });
    req.on('error', reject);
    if (payload) req.write(payload);
    req.end();
  });
}
```

