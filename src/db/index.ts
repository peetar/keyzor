import path from "path";
import fs from "fs";
import { neon } from "@neondatabase/serverless";
import { drizzle as drizzleNeon } from "drizzle-orm/neon-http";
import { PGlite } from "@electric-sql/pglite";
import { drizzle as drizzlePglite } from "drizzle-orm/pglite";
import { sql, eq } from "drizzle-orm";
import * as schema from "./schema";
import { hashApiKey } from "@/lib/crypto";

type DrizzleInstance = ReturnType<typeof drizzlePglite<typeof schema>>;

const globalForDb = globalThis as unknown as {
  __kazorPglite?: PGlite;
  __kazorDb?: DrizzleInstance;
  __kazorInitPromise?: Promise<void>;
};

export const DEMO_API_KEY = "kz_live_demo_architect_2026";
export const DEFAULT_USER_ID = "usr_architect_peter";

function getOrCreateDbInstance(): DrizzleInstance {
  if (globalForDb.__kazorDb) {
    return globalForDb.__kazorDb;
  }

  const dbUrl = process.env.DATABASE_URL?.trim();

  if (
    dbUrl &&
    (dbUrl.startsWith("postgres://") || dbUrl.startsWith("postgresql://"))
  ) {
    const client = neon(dbUrl);
    globalForDb.__kazorDb = drizzleNeon(client, {
      schema,
    }) as unknown as DrizzleInstance;
    return globalForDb.__kazorDb;
  }

  if (!globalForDb.__kazorPglite) {
    const dataDir = path.join(process.cwd(), ".kazor-data", "pgdata");
    try {
      fs.mkdirSync(path.dirname(dataDir), { recursive: true });
      globalForDb.__kazorPglite = new PGlite(dataDir);
    } catch {
      globalForDb.__kazorPglite = new PGlite();
    }
  }

  globalForDb.__kazorDb = drizzlePglite(globalForDb.__kazorPglite, { schema });
  return globalForDb.__kazorDb;
}

// Lazy proxy so importing `db` during Next.js static build analysis never opens PGlite prematurely
export const db: DrizzleInstance = new Proxy({} as DrizzleInstance, {
  get(_target, prop, receiver) {
    const instance = getOrCreateDbInstance();
    const value = Reflect.get(instance, prop, receiver);
    return typeof value === "function" ? value.bind(instance) : value;
  },
});

export async function ensureDatabaseReady(): Promise<void> {
  if (globalForDb.__kazorInitPromise) {
    return globalForDb.__kazorInitPromise;
  }

  globalForDb.__kazorInitPromise = (async () => {
    let activeDb = getOrCreateDbInstance();
    try {
      await activeDb.execute(sql`SELECT 1`);
    } catch {
      // Recover if local .kazor-data had a stale lock from an interrupted build worker
      globalForDb.__kazorPglite = new PGlite();
      globalForDb.__kazorDb = drizzlePglite(globalForDb.__kazorPglite, {
        schema,
      });
      activeDb = globalForDb.__kazorDb;
    }
    await activeDb.execute(sql`
      CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        email TEXT NOT NULL UNIQUE,
        name TEXT NOT NULL,
        image TEXT,
        provider TEXT NOT NULL DEFAULT 'credentials',
        created_at TIMESTAMP NOT NULL DEFAULT NOW()
      )
    `);

    await activeDb.execute(sql`
      CREATE TABLE IF NOT EXISTS api_keys (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        name TEXT NOT NULL,
        key_hash TEXT NOT NULL UNIQUE,
        key_prefix TEXT NOT NULL,
        last_used_at TIMESTAMP,
        created_at TIMESTAMP NOT NULL DEFAULT NOW()
      )
    `);

    await activeDb.execute(sql`
      CREATE TABLE IF NOT EXISTS projects (
        id TEXT PRIMARY KEY,
        owner_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        slug TEXT NOT NULL UNIQUE,
        name TEXT NOT NULL,
        description TEXT NOT NULL DEFAULT '',
        share_enabled BOOLEAN NOT NULL DEFAULT TRUE,
        share_version TEXT NOT NULL,
        default_stages JSONB NOT NULL,
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP NOT NULL DEFAULT NOW()
      )
    `);

    await activeDb.execute(sql`
      CREATE TABLE IF NOT EXISTS features (
        id TEXT PRIMARY KEY,
        project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
        slug TEXT NOT NULL,
        title TEXT NOT NULL,
        summary TEXT NOT NULL DEFAULT '',
        current_stage_id TEXT,
        current_owner TEXT NOT NULL DEFAULT 'Unassigned',
        target_date TEXT,
        expected_date TEXT,
        status TEXT NOT NULL DEFAULT 'active',
        priority TEXT NOT NULL DEFAULT 'high',
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP NOT NULL DEFAULT NOW()
      )
    `);

    await activeDb.execute(sql`
      CREATE TABLE IF NOT EXISTS feature_stages (
        id TEXT PRIMARY KEY,
        feature_id TEXT NOT NULL REFERENCES features(id) ON DELETE CASCADE,
        name TEXT NOT NULL,
        sort_order INTEGER NOT NULL,
        status TEXT NOT NULL DEFAULT 'pending',
        owner TEXT NOT NULL DEFAULT '',
        planned_start_date TEXT,
        planned_end_date TEXT,
        actual_start_date TEXT,
        actual_end_date TEXT,
        agent_instructions TEXT NOT NULL DEFAULT '',
        proactive_trigger TEXT NOT NULL DEFAULT '',
        notes TEXT NOT NULL DEFAULT '',
        updated_at TIMESTAMP NOT NULL DEFAULT NOW()
      )
    `);

    await activeDb.execute(sql`
      CREATE TABLE IF NOT EXISTS stage_links (
        id TEXT PRIMARY KEY,
        feature_id TEXT NOT NULL REFERENCES features(id) ON DELETE CASCADE,
        stage_id TEXT REFERENCES feature_stages(id) ON DELETE SET NULL,
        label TEXT NOT NULL,
        url TEXT NOT NULL,
        link_type TEXT NOT NULL DEFAULT 'other',
        created_by TEXT NOT NULL DEFAULT 'Architect',
        created_at TIMESTAMP NOT NULL DEFAULT NOW()
      )
    `);

    await activeDb.execute(sql`
      CREATE TABLE IF NOT EXISTS activity_logs (
        id TEXT PRIMARY KEY,
        project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
        feature_id TEXT REFERENCES features(id) ON DELETE CASCADE,
        actor_type TEXT NOT NULL DEFAULT 'agent',
        actor_name TEXT NOT NULL,
        action TEXT NOT NULL,
        details TEXT NOT NULL DEFAULT '',
        created_at TIMESTAMP NOT NULL DEFAULT NOW()
      )
    `);

    const existingUsers = await activeDb
      .select()
      .from(schema.users)
      .where(eq(schema.users.id, DEFAULT_USER_ID));

    if (existingUsers.length === 0) {
      await seedInitialWorkspace(activeDb);
    }
  })();

  return globalForDb.__kazorInitPromise;
}

async function seedInitialWorkspace(activeDb: DrizzleInstance) {
  await activeDb.insert(schema.users).values({
    id: DEFAULT_USER_ID,
    email: "architect@kazor.app",
    name: "Lead Architect (CPO / Dev)",
    provider: "credentials",
  });

  await activeDb.insert(schema.apiKeys).values({
    id: "key_default_agent",
    userId: DEFAULT_USER_ID,
    name: "Primary Coding Agent (Antigravity / Cursor / Claude)",
    keyHash: hashApiKey(DEMO_API_KEY),
    keyPrefix: "kz_live_demo...2026",
  });

  const projectId = "proj_core_platform";
  await activeDb.insert(schema.projects).values({
    id: projectId,
    ownerId: DEFAULT_USER_ID,
    slug: "enterprise-cloud-v2",
    name: "Enterprise Cloud Platform v2",
    description:
      "Core multi-tenant architecture, distributed dev team handoffs, and AI-assisted feature rollout.",
    shareEnabled: true,
    shareVersion: "v1_seed_token",
    defaultStages: schema.DEFAULT_ARCHITECT_STAGES,
  });

  const feat1Id = "feat_sso_federation";
  await activeDb.insert(schema.features).values({
    id: feat1Id,
    projectId,
    slug: "enterprise-sso-saml",
    title: "Enterprise SSO & SAML Federation",
    summary:
      "Multi-tenant SAML 2.0 + OIDC login flow designed in design.md and handed over to offshore dev team for prototype demo.",
    currentStageId: "stg_f1_4",
    currentOwner: "India Dev Team (Rohan) + Auth Agent",
    targetDate: "2026-11-10",
    expectedDate: "2026-11-08",
    status: "active",
    priority: "critical",
  });

  const f1Stages = [
    {
      id: "stg_f1_1",
      name: "Brainstorming & Scope",
      sortOrder: 0,
      status: "completed",
      owner: "CPO / Client Visionary",
      plannedStartDate: "2026-10-12",
      plannedEndDate: "2026-10-14",
      actualStartDate: "2026-10-12",
      actualEndDate: "2026-10-14",
      notes: "Aligned with CEO on Okta & Azure AD enterprise requirements.",
    },
    {
      id: "stg_f1_2",
      name: "Architecture & design.md",
      sortOrder: 1,
      status: "completed",
      owner: "Lead Architect",
      plannedStartDate: "2026-10-15",
      plannedEndDate: "2026-10-19",
      actualStartDate: "2026-10-15",
      actualEndDate: "2026-10-18",
      notes: "Completed SAML assertion sequence diagram and design.md spec.",
    },
    {
      id: "stg_f1_3",
      name: "Handed Over to Dev",
      sortOrder: 2,
      status: "completed",
      owner: "India Dev Team",
      plannedStartDate: "2026-10-19",
      plannedEndDate: "2026-10-21",
      actualStartDate: "2026-10-19",
      actualEndDate: "2026-10-20",
      notes: "Delivered design.md and repo scaffolding; walkthrough call done.",
    },
    {
      id: "stg_f1_4",
      name: "Prototype Demo",
      sortOrder: 3,
      status: "in_progress",
      owner: "India Dev Team (Rohan)",
      plannedStartDate: "2026-10-21",
      plannedEndDate: "2026-10-28",
      actualStartDate: "2026-10-21",
      actualEndDate: null,
      notes: "IdP callback prototype working; demo scheduled for Thursday.",
    },
    {
      id: "stg_f1_5",
      name: "Deployed on Dev/Test",
      sortOrder: 4,
      status: "pending",
      owner: "DevOps / QA",
      plannedStartDate: "2026-10-29",
      plannedEndDate: "2026-11-02",
      actualStartDate: null,
      actualEndDate: null,
      notes: "",
    },
    {
      id: "stg_f1_6",
      name: "Bugfixes & Feedback",
      sortOrder: 5,
      status: "pending",
      owner: "India Dev Team + Architect",
      plannedStartDate: "2026-11-03",
      plannedEndDate: "2026-11-07",
      actualStartDate: null,
      actualEndDate: null,
      notes: "",
    },
    {
      id: "stg_f1_7",
      name: "Live in Production",
      sortOrder: 6,
      status: "pending",
      owner: "Release Pipeline",
      plannedStartDate: "2026-11-08",
      plannedEndDate: "2026-11-10",
      actualStartDate: null,
      actualEndDate: null,
      notes: "",
    },
  ];

  for (const s of f1Stages) {
    const tmpl = schema.DEFAULT_ARCHITECT_STAGES[s.sortOrder];
    await activeDb.insert(schema.featureStages).values({
      ...s,
      featureId: feat1Id,
      agentInstructions: tmpl?.agentInstructions ?? "",
      proactiveTrigger: tmpl?.proactiveTrigger ?? "",
    });
  }

  await activeDb.insert(schema.stageLinks).values([
    {
      id: "lnk_1",
      featureId: feat1Id,
      stageId: "stg_f1_2",
      label: "SSO Architecture design.md",
      url: "https://github.com/org/enterprise-cloud/blob/main/docs/sso-design.md",
      linkType: "design_doc",
      createdBy: "Antigravity Agent",
    },
    {
      id: "lnk_2",
      featureId: feat1Id,
      stageId: "stg_f1_4",
      label: "Draft PR #142 (SAML Callback Handler)",
      url: "https://github.com/org/enterprise-cloud/pull/142",
      linkType: "github",
      createdBy: "Dev Team Agent",
    },
  ]);

  const feat2Id = "feat_realtime_billing";
  await activeDb.insert(schema.features).values({
    id: feat2Id,
    projectId,
    slug: "usage-metering-engine",
    title: "Real-Time Usage Metering & Webhook Engine",
    summary:
      "Event ingestion pipeline for API token metering. Currently deployed on dev test server undergoing load-test bugfixes.",
    currentStageId: "stg_f2_6",
    currentOwner: "Lead Architect (Dev Hat) + Coding Agent",
    targetDate: "2026-11-01",
    expectedDate: "2026-11-05",
    status: "active",
    priority: "high",
  });

  const f2Stages = [
    {
      id: "stg_f2_1",
      name: "Brainstorming & Scope",
      sortOrder: 0,
      status: "completed",
      owner: "CPO",
      plannedStartDate: "2026-10-05",
      plannedEndDate: "2026-10-07",
      actualStartDate: "2026-10-05",
      actualEndDate: "2026-10-07",
      notes: "Defined usage tiers with CEO.",
    },
    {
      id: "stg_f2_2",
      name: "Architecture & design.md",
      sortOrder: 1,
      status: "completed",
      owner: "Lead Architect",
      plannedStartDate: "2026-10-08",
      plannedEndDate: "2026-10-11",
      actualStartDate: "2026-10-08",
      actualEndDate: "2026-10-12",
      notes: "Idempotency key schema finalized in design.md.",
    },
    {
      id: "stg_f2_3",
      name: "Handed Over to Dev",
      sortOrder: 2,
      status: "completed",
      owner: "Backend Team",
      plannedStartDate: "2026-10-12",
      plannedEndDate: "2026-10-14",
      actualStartDate: "2026-10-12",
      actualEndDate: "2026-10-14",
      notes: "Handed over with OpenAPI contract.",
    },
    {
      id: "stg_f2_4",
      name: "Prototype Demo",
      sortOrder: 3,
      status: "completed",
      owner: "Backend Team",
      plannedStartDate: "2026-10-15",
      plannedEndDate: "2026-10-20",
      actualStartDate: "2026-10-15",
      actualEndDate: "2026-10-21",
      notes: "Demoed 10k events/sec ingestion locally.",
    },
    {
      id: "stg_f2_5",
      name: "Deployed on Dev/Test",
      sortOrder: 4,
      status: "completed",
      owner: "DevOps Agent",
      plannedStartDate: "2026-10-21",
      plannedEndDate: "2026-10-24",
      actualStartDate: "2026-10-22",
      actualEndDate: "2026-10-25",
      notes: "Live on staging-metering.kazor.internal.",
    },
    {
      id: "stg_f2_6",
      name: "Bugfixes & Feedback",
      sortOrder: 5,
      status: "in_progress",
      owner: "Lead Architect (Dev Hat)",
      plannedStartDate: "2026-10-25",
      plannedEndDate: "2026-10-29",
      actualStartDate: "2026-10-25",
      actualEndDate: null,
      notes: "Fixing dead-letter queue retry spike under burst traffic (PR #159).",
    },
    {
      id: "stg_f2_7",
      name: "Live in Production",
      sortOrder: 6,
      status: "pending",
      owner: "Release Pipeline",
      plannedStartDate: "2026-10-30",
      plannedEndDate: "2026-11-01",
      actualStartDate: null,
      actualEndDate: null,
      notes: "",
    },
  ];

  for (const s of f2Stages) {
    const tmpl = schema.DEFAULT_ARCHITECT_STAGES[s.sortOrder];
    await activeDb.insert(schema.featureStages).values({
      ...s,
      featureId: feat2Id,
      agentInstructions: tmpl?.agentInstructions ?? "",
      proactiveTrigger: tmpl?.proactiveTrigger ?? "",
    });
  }

  await activeDb.insert(schema.stageLinks).values([
    {
      id: "lnk_3",
      featureId: feat2Id,
      stageId: "stg_f2_5",
      label: "Staging Test Server",
      url: "https://staging-metering.example.com/health",
      linkType: "preview_url",
      createdBy: "DevOps Agent",
    },
    {
      id: "lnk_4",
      featureId: feat2Id,
      stageId: "stg_f2_6",
      label: "Bugfix PR #159 (DLQ Retry Backoff)",
      url: "https://github.com/org/enterprise-cloud/pull/159",
      linkType: "github",
      createdBy: "Antigravity Agent",
    },
    {
      id: "lnk_5",
      featureId: feat2Id,
      stageId: "stg_f2_1",
      label: "Trello Product Spec Card",
      url: "https://trello.com/c/metering-v2",
      linkType: "trello",
      createdBy: "Lead Architect",
    },
  ]);

  const feat3Id = "feat_ai_copilot_export";
  await activeDb.insert(schema.features).values({
    id: feat3Id,
    projectId,
    slug: "ai-executive-report-export",
    title: "AI Executive Report & Stakeholder Digest",
    summary:
      "New CEO request: weekly automated PDF/Slack digest of feature milestones. Currently in initial CPO brainstorming.",
    currentStageId: "stg_f3_1",
    currentOwner: "CPO + Antigravity Brainstorm Agent",
    targetDate: "2026-11-24",
    expectedDate: "2026-11-22",
    status: "active",
    priority: "medium",
  });

  for (let i = 0; i < schema.DEFAULT_ARCHITECT_STAGES.length; i++) {
    const tmpl = schema.DEFAULT_ARCHITECT_STAGES[i];
    await activeDb.insert(schema.featureStages).values({
      id: `stg_f3_${i + 1}`,
      featureId: feat3Id,
      name: tmpl.name,
      sortOrder: i,
      status: i === 0 ? "in_progress" : "pending",
      owner: i === 0 ? "CPO + Antigravity Agent" : tmpl.defaultOwnerRole,
      plannedStartDate: i === 0 ? "2026-10-26" : null,
      plannedEndDate: i === 0 ? "2026-10-30" : null,
      actualStartDate: i === 0 ? "2026-10-26" : null,
      actualEndDate: null,
      agentInstructions: tmpl.agentInstructions,
      proactiveTrigger: tmpl.proactiveTrigger,
      notes:
        i === 0
          ? "Flowchart initialized by agent during CEO brainstorming session."
          : "",
    });
  }

  await activeDb.insert(schema.activityLogs).values([
    {
      id: "act_1",
      projectId,
      featureId: feat3Id,
      actorType: "agent",
      actorName: "Antigravity Agent",
      action: "Created Feature Flowchart",
      details:
        "Initialized 'AI Executive Report & Stakeholder Digest' in Brainstorming & Scope stage with 7 lifecycle stages.",
    },
    {
      id: "act_2",
      projectId,
      featureId: feat1Id,
      actorType: "agent",
      actorName: "Antigravity Agent",
      action: "Handed Over design.md to Dev",
      details:
        "Attached SSO Architecture design.md and transitioned 'Enterprise SSO & SAML Federation' to Prototype Demo (Owner: India Dev Team).",
    },
    {
      id: "act_3",
      projectId,
      featureId: feat2Id,
      actorType: "human",
      actorName: "Lead Architect",
      action: "Opened Bugfix PR & Updated Expected Date",
      details:
        "Attached PR #159 for DLQ retry backoff and updated Expected Date to 2026-11-05 (+4d variance).",
    },
  ]);
}
