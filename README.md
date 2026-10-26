# KAZOR — AI-Native Feature Flowchart & Gantt Status Tracker

**KAZOR** is a minimalist, AI-first project and feature status dashboard built for **software architects and agentic developers** who wear multiple hats (CPO brainstorming with a client/CEO, Architect handing `design.md` to a dev team, Developer opening PRs and shipping fixes).

## Core Highlights

1. **Answers the 4 Core Questions at a Glance**:
   - **Where is this feature?** (Current stage in the interactive Flowchart & Gantt timeline)
   - **Who is working on it?** (Active owner, dev team, or coding agent)
   - **When do we want it done?** (Target deadline)
   - **When do we expect it to be done?** (Projected completion date with automatic schedule variance tracking)
2. **Self-Bootstrapping Instructional Agent API (`GET /hello`)**:
   - Point any AI coding agent (Antigravity, Claude Code, Cursor, Windsurf) at `GET /hello` to receive a ready-to-save `SKILL.md` and instructional API guide.
   - Every `/api/v1/*` endpoint returns an `agent_guidance` envelope with current stage instructions, proactive milestone triggers, and next recommended API calls.
3. **AES-256-GCM Encrypted Stakeholder Share Links (`/share/[token]`)**:
   - Share a live, read-only presentation view of your project's Gantt chart and Flowchart with clients, CEOs, or external dev leads—accessible only via an encrypted, rotatable share link.
4. **Zero-Hassle Database & Free OAuth**:
   - **Local Development**: Automatically runs an embedded PostgreSQL instance (`@electric-sql/pglite` in `.kazor-data`) pre-seeded with realistic architect & dev handoff flows—zero setup required.
   - **Vercel Production**: Connect Vercel's free 1-click **Neon Serverless Postgres** (`DATABASE_URL`), plus optional free **GitHub / Google OAuth** (`AUTH_GITHUB_ID`, `AUTH_GITHUB_SECRET`).

## Quick Start

```bash
npm install
npm run dev
```

Open `http://localhost:3000` for the Architect Dashboard, or `http://localhost:3000/hello` for the Agent Skill Onboarding Endpoint.
