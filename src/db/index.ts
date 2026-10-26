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
  __keyzorPglite?: PGlite;
  __keyzorDb?: DrizzleInstance;
  __keyzorInitPromise?: Promise<void>;
};

export const DEMO_API_KEY = "kz_live_demo_architect_2026";
export const DEFAULT_USER_ID = "usr_architect_peter";

function getOrCreateDbInstance(): DrizzleInstance {
  if (globalForDb.__keyzorDb) {
    return globalForDb.__keyzorDb;
  }

  const dbUrl = process.env.DATABASE_URL?.trim();

  if (
    dbUrl &&
    (dbUrl.startsWith("postgres://") || dbUrl.startsWith("postgresql://"))
  ) {
    const client = neon(dbUrl);
    globalForDb.__keyzorDb = drizzleNeon(client, {
      schema,
    }) as unknown as DrizzleInstance;
    return globalForDb.__keyzorDb;
  }

  if (!globalForDb.__keyzorPglite) {
    const dataDir = path.join(process.cwd(), ".keyzor-data", "pgdata");
    try {
      fs.mkdirSync(path.dirname(dataDir), { recursive: true });
      globalForDb.__keyzorPglite = new PGlite(dataDir);
    } catch {
      globalForDb.__keyzorPglite = new PGlite();
    }
  }

  globalForDb.__keyzorDb = drizzlePglite(globalForDb.__keyzorPglite, { schema });
  return globalForDb.__keyzorDb;
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
  if (globalForDb.__keyzorInitPromise) {
    return globalForDb.__keyzorInitPromise;
  }

  globalForDb.__keyzorInitPromise = (async () => {
    let activeDb = getOrCreateDbInstance();
    try {
      await activeDb.execute(sql`SELECT 1`);
    } catch {
      // Recover if local .keyzor-data had a stale lock from an interrupted build worker
      globalForDb.__keyzorPglite = new PGlite();
      globalForDb.__keyzorDb = drizzlePglite(globalForDb.__keyzorPglite, {
        schema,
      });
      activeDb = globalForDb.__keyzorDb;
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

  return globalForDb.__keyzorInitPromise;
}

async function seedInitialWorkspace(activeDb: DrizzleInstance) {
  await activeDb.insert(schema.users).values({
    id: DEFAULT_USER_ID,
    email: "architect@keyzor.vercel.app",
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

}
