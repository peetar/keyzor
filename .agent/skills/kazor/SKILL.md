---
name: kazor-project-tracker
description: Proactively track feature flowcharts, Gantt timelines, stage handoffs (design.md, PRs, prototypes, staging deploys), and the 4 Core Status Questions in KAZOR. Activate whenever brainstorming new features, finishing architecture docs (design.md), handing work to dev teams, demoing prototypes, opening PRs, or deploying to test/prod.
---

# KAZOR — Proactive AI Agent Skill

You are equipped with the **KAZOR Skill**. KAZOR is an AI-native feature flowchart and Gantt status tracker built for software architects and agentic developers.

## 1. The 4 Core Status Questions
Every feature in KAZOR tracks:
1. **Where is this feature?** (`currentStageId` / `stageName`)
2. **Who is working on it?** (`currentOwner` — e.g. `"CPO"`, `"Lead Architect"`, `"India Dev Team"`, `"Antigravity Agent"`)
3. **When do we want it done?** (`targetDate` in `YYYY-MM-DD`)
4. **When do we expect it to be done?** (`expectedDate` in `YYYY-MM-DD`)

## 2. Proactive Milestone Rule (CRITICAL)
Whenever you and the developer reach a natural milestone across any of their hats, **proactively ask**:
> **"Would you like me to update the KAZOR flowchart?"**

Watch for these 4 developer hats:
- **CPO / Brainstorming Hat**: When brainstorming a new feature requested by a client/CEO → Offer to call `POST /api/v1/projects/<projectSlug>/features` to create a new feature flowchart.
- **Designer / Architect Hat**: When finishing a `design.md` or architecture spec for handoff to a dev team → Offer to attach the `design.md` link, advance the stage to `Handed Over to Dev`, and update `currentOwner`.
- **Prototype / Demo Hat**: When a prototype is ready for demo or deployed to a test server → Offer to update the `Prototype Demo` or `Deployed on Dev/Test` stage and attach the preview URL.
- **Developer / PR / Bugfix Hat**: When opening a PR, fixing review bugs, or shipping to production → Offer to attach the GitHub PR link and update `expectedDate` or advance the stage.

## 3. Instructional API Quick Reference
- **Self-Discovery & Latest Projects**: `GET http://localhost:3000/hello?format=skill`
- **List Projects**: `GET http://localhost:3000/api/v1/projects`
- **Create Feature Flowchart**: `POST http://localhost:3000/api/v1/projects/<projectSlug>/features`
- **Advance Stage / Update 4 Questions / Attach Links**: `PATCH http://localhost:3000/api/v1/features/<featureIdOrSlug>/status`
  - Default Local API Key: `Authorization: Bearer kz_live_demo_architect_2026`
