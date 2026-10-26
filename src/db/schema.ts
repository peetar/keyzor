import {
  pgTable,
  text,
  integer,
  boolean,
  timestamp,
  jsonb,
} from "drizzle-orm/pg-core";

export interface StageTemplateItem {
  name: string;
  defaultOwnerRole: string;
  agentInstructions: string;
  proactiveTrigger: string;
}

export const DEFAULT_ARCHITECT_STAGES: StageTemplateItem[] = [
  {
    name: "Brainstorming & Scope",
    defaultOwnerRole: "CPO / Architect",
    agentInstructions:
      "Clarify the problem statement, user value, target completion date ('When we want it done'), and initial projected date ('When we expect it done').",
    proactiveTrigger:
      "When the user finishes outlining a new feature idea or requirements conversation, ask: 'Would you like to update the KAZOR flowchart and lock in our target dates?'",
  },
  {
    name: "Architecture & design.md",
    defaultOwnerRole: "Software Architect",
    agentInstructions:
      "Draft and finalize the technical architecture or design.md document. Attach the repository or document link to this stage before handing over to dev.",
    proactiveTrigger:
      "When a design.md, RFC, or technical specification file is created or finalized, ask: 'Would you like me to attach design.md and advance the KAZOR flowchart to Dev Handover?'",
  },
  {
    name: "Handed Over to Dev",
    defaultOwnerRole: "Dev Team",
    agentInstructions:
      "Architecture and design.md have been delivered to the development team. Update 'currentOwner' to the assigned developer, team, or coding agent.",
    proactiveTrigger:
      "When implementation work begins or a feature branch is created, ask: 'Should I update KAZOR to show Dev is actively building the prototype?'",
  },
  {
    name: "Prototype Demo",
    defaultOwnerRole: "Dev Team / Architect Review",
    agentInstructions:
      "Build a functional prototype and demo it to the architect/stakeholders. Attach a PR link or demo recording/URL.",
    proactiveTrigger:
      "When a working prototype is ready for demo or a draft PR is opened, ask: 'Would you like to update the KAZOR flowchart with the prototype link?'",
  },
  {
    name: "Deployed on Dev/Test",
    defaultOwnerRole: "Dev / DevOps",
    agentInstructions:
      "Deploy the feature to the staging/dev test server for integration testing and stakeholder review. Attach the preview/staging URL.",
    proactiveTrigger:
      "When deployed to a staging/preview environment, ask: 'Would you like to log the test server URL and advance KAZOR to Deployed on Dev/Test?'",
  },
  {
    name: "Bugfixes & Feedback",
    defaultOwnerRole: "Dev Team / QA",
    agentInstructions:
      "Iterate on feedback from the test server, resolve bugs, and refine expected completion date if scope shifted.",
    proactiveTrigger:
      "When bugfix commits or review fixes are completed, ask: 'All feedback items look addressed—should we update KAZOR?'",
  },
  {
    name: "Live in Production",
    defaultOwnerRole: "Released",
    agentInstructions:
      "Feature is verified and live in production. Record final completion timestamp and production URL.",
    proactiveTrigger:
      "When merged to main/production or released, ask: 'Congrats on shipping! Would you like to mark this feature Live in Production on KAZOR?'",
  },
];

export const users = pgTable("users", {
  id: text("id").primaryKey(),
  email: text("email").notNull().unique(),
  name: text("name").notNull(),
  image: text("image"),
  provider: text("provider").notNull().default("credentials"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const apiKeys = pgTable("api_keys", {
  id: text("id").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  keyHash: text("key_hash").notNull().unique(),
  keyPrefix: text("key_prefix").notNull(),
  lastUsedAt: timestamp("last_used_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const projects = pgTable("projects", {
  id: text("id").primaryKey(),
  ownerId: text("owner_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  slug: text("slug").notNull().unique(),
  name: text("name").notNull(),
  description: text("description").notNull().default(""),
  shareEnabled: boolean("share_enabled").notNull().default(true),
  shareVersion: text("share_version").notNull(),
  defaultStages: jsonb("default_stages")
    .$type<StageTemplateItem[]>()
    .notNull()
    .default(DEFAULT_ARCHITECT_STAGES),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const features = pgTable("features", {
  id: text("id").primaryKey(),
  projectId: text("project_id")
    .notNull()
    .references(() => projects.id, { onDelete: "cascade" }),
  slug: text("slug").notNull(),
  title: text("title").notNull(),
  summary: text("summary").notNull().default(""),
  // The 4 Core Questions:
  // 1. Where is this feature? -> currentStageName / currentStageIndex
  currentStageId: text("current_stage_id"),
  // 2. Who is working on it? -> currentOwner
  currentOwner: text("current_owner").notNull().default("Unassigned"),
  // 3. When do we want it done? -> targetDate (YYYY-MM-DD)
  targetDate: text("target_date"),
  // 4. When do we expect it to be done? -> expectedDate (YYYY-MM-DD)
  expectedDate: text("expected_date"),
  status: text("status").notNull().default("active"), // active | blocked | completed | archived
  priority: text("priority").notNull().default("high"), // critical | high | medium | low
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const featureStages = pgTable("feature_stages", {
  id: text("id").primaryKey(),
  featureId: text("feature_id")
    .notNull()
    .references(() => features.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  sortOrder: integer("sort_order").notNull(),
  status: text("status").notNull().default("pending"), // pending | in_progress | review_needed | completed | skipped
  owner: text("owner").notNull().default(""),
  plannedStartDate: text("planned_start_date"), // YYYY-MM-DD
  plannedEndDate: text("planned_end_date"), // YYYY-MM-DD
  actualStartDate: text("actual_start_date"), // YYYY-MM-DD
  actualEndDate: text("actual_end_date"), // YYYY-MM-DD
  agentInstructions: text("agent_instructions").notNull().default(""),
  proactiveTrigger: text("proactive_trigger").notNull().default(""),
  notes: text("notes").notNull().default(""),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const stageLinks = pgTable("stage_links", {
  id: text("id").primaryKey(),
  featureId: text("feature_id")
    .notNull()
    .references(() => features.id, { onDelete: "cascade" }),
  stageId: text("stage_id").references(() => featureStages.id, {
    onDelete: "set null",
  }),
  label: text("label").notNull(),
  url: text("url").notNull(),
  linkType: text("link_type").notNull().default("other"), // design_doc | github | preview_url | trello | other
  createdBy: text("created_by").notNull().default("Architect"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const activityLogs = pgTable("activity_logs", {
  id: text("id").primaryKey(),
  projectId: text("project_id")
    .notNull()
    .references(() => projects.id, { onDelete: "cascade" }),
  featureId: text("feature_id").references(() => features.id, {
    onDelete: "cascade",
  }),
  actorType: text("actor_type").notNull().default("agent"), // agent | human
  actorName: text("actor_name").notNull(),
  action: text("action").notNull(),
  details: text("details").notNull().default(""),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});
