import crypto from "crypto";
import { eq, asc, desc, and } from "drizzle-orm";
import { db, ensureDatabaseReady, DEFAULT_USER_ID } from "@/db";
import * as schema from "@/db/schema";
import {
  createEncryptedShareToken,
  verifyEncryptedShareToken,
  generateApiKey,
  hashApiKey,
} from "@/lib/crypto";

export interface EnrichedStage {
  id: string;
  featureId: string;
  name: string;
  sortOrder: number;
  status: string;
  owner: string;
  plannedStartDate: string | null;
  plannedEndDate: string | null;
  actualStartDate: string | null;
  actualEndDate: string | null;
  agentInstructions: string;
  proactiveTrigger: string;
  notes: string;
  links: Array<{
    id: string;
    label: string;
    url: string;
    linkType: string;
    createdBy: string;
  }>;
}

export interface FourQuestionsStatus {
  where: {
    stageId: string | null;
    stageName: string;
    stageIndex: number;
    totalStages: number;
    percentComplete: number;
  };
  who: string;
  whenWantDone: string | null;
  whenExpectDone: string | null;
  scheduleVarianceDays: number | null; // negative = early, 0 = on track, positive = slipping days
  scheduleHealth: "on_track" | "early" | "slipping" | "unscheduled";
}

export interface EnrichedFeature {
  id: string;
  projectId: string;
  slug: string;
  title: string;
  summary: string;
  status: string;
  priority: string;
  currentStageId: string | null;
  currentOwner: string;
  targetDate: string | null;
  expectedDate: string | null;
  fourQuestions: FourQuestionsStatus;
  stages: EnrichedStage[];
  links: Array<{
    id: string;
    stageId: string | null;
    label: string;
    url: string;
    linkType: string;
    createdBy: string;
  }>;
  updatedAt: string;
}

export interface EnrichedProject {
  id: string;
  slug: string;
  name: string;
  description: string;
  shareEnabled: boolean;
  encryptedShareToken: string;
  defaultStages: schema.StageTemplateItem[];
  features: EnrichedFeature[];
  recentActivity: Array<{
    id: string;
    featureId: string | null;
    actorType: string;
    actorName: string;
    action: string;
    details: string;
    createdAt: string;
  }>;
}

function todayIsoDate(): string {
  return new Date().toISOString().slice(0, 10);
}

function addDaysIso(startIso: string, days: number): string {
  const d = new Date(`${startIso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

function computeFourQuestions(
  feature: typeof schema.features.$inferSelect,
  stages: EnrichedStage[]
): FourQuestionsStatus {
  const totalStages = stages.length || 1;
  const activeIdx = stages.findIndex((s) => s.id === feature.currentStageId);
  const completedCount = stages.filter((s) => s.status === "completed").length;
  const currentStage =
    activeIdx >= 0
      ? stages[activeIdx]
      : stages.find((s) => s.status === "in_progress") || stages[0];

  const stageIndex = currentStage ? currentStage.sortOrder : 0;
  const percentComplete =
    feature.status === "completed"
      ? 100
      : Math.round((completedCount / totalStages) * 100);

  let scheduleVarianceDays: number | null = null;
  let scheduleHealth: FourQuestionsStatus["scheduleHealth"] = "unscheduled";

  if (feature.targetDate && feature.expectedDate) {
    const t = new Date(`${feature.targetDate}T00:00:00Z`).getTime();
    const e = new Date(`${feature.expectedDate}T00:00:00Z`).getTime();
    if (!Number.isNaN(t) && !Number.isNaN(e)) {
      scheduleVarianceDays = Math.round((e - t) / (1000 * 60 * 60 * 24));
      if (scheduleVarianceDays > 0) {
        scheduleHealth = "slipping";
      } else if (scheduleVarianceDays < 0) {
        scheduleHealth = "early";
      } else {
        scheduleHealth = "on_track";
      }
    }
  } else if (feature.targetDate || feature.expectedDate) {
    scheduleHealth = "on_track";
  }

  return {
    where: {
      stageId: currentStage?.id ?? null,
      stageName: currentStage?.name ?? "Unstaged",
      stageIndex,
      totalStages: stages.length,
      percentComplete,
    },
    who: feature.currentOwner || currentStage?.owner || "Unassigned",
    whenWantDone: feature.targetDate ?? null,
    whenExpectDone: feature.expectedDate ?? null,
    scheduleVarianceDays,
    scheduleHealth,
  };
}

export async function listProjects(): Promise<EnrichedProject[]> {
  await ensureDatabaseReady();
  const allProjects = await db
    .select()
    .from(schema.projects)
    .orderBy(asc(schema.projects.createdAt));

  const results: EnrichedProject[] = [];
  for (const p of allProjects) {
    const enriched = await getProjectByIdOrSlug(p.id);
    if (enriched) results.push(enriched);
  }
  return results;
}

export async function getProjectByIdOrSlug(
  idOrSlug: string
): Promise<EnrichedProject | null> {
  await ensureDatabaseReady();
  const rows = await db
    .select()
    .from(schema.projects)
    .where(eq(schema.projects.slug, idOrSlug));

  const project =
    rows[0] ??
    (
      await db
        .select()
        .from(schema.projects)
        .where(eq(schema.projects.id, idOrSlug))
    )[0];

  if (!project) return null;

  const projectFeatures = await db
    .select()
    .from(schema.features)
    .where(eq(schema.features.projectId, project.id))
    .orderBy(asc(schema.features.createdAt));

  const enrichedFeatures: EnrichedFeature[] = [];
  for (const f of projectFeatures) {
    const enrichedFeature = await getFeatureByIdOrSlug(f.id);
    if (enrichedFeature) enrichedFeatures.push(enrichedFeature);
  }

  const logs = await db
    .select()
    .from(schema.activityLogs)
    .where(eq(schema.activityLogs.projectId, project.id))
    .orderBy(desc(schema.activityLogs.createdAt))
    .limit(20);

  return {
    id: project.id,
    slug: project.slug,
    name: project.name,
    description: project.description,
    shareEnabled: project.shareEnabled,
    encryptedShareToken: createEncryptedShareToken(
      project.id,
      project.shareVersion
    ),
    defaultStages: project.defaultStages ?? schema.DEFAULT_ARCHITECT_STAGES,
    features: enrichedFeatures,
    recentActivity: logs.map((l) => ({
      id: l.id,
      featureId: l.featureId,
      actorType: l.actorType,
      actorName: l.actorName,
      action: l.action,
      details: l.details,
      createdAt: l.createdAt.toISOString(),
    })),
  };
}

export async function getProjectByEncryptedShareToken(
  token: string
): Promise<EnrichedProject | null> {
  await ensureDatabaseReady();
  const payload = verifyEncryptedShareToken(token);
  if (!payload) return null;

  const rows = await db
    .select()
    .from(schema.projects)
    .where(eq(schema.projects.id, payload.projectId));

  const project = rows[0];
  if (!project) return null;
  if (!project.shareEnabled) return null;
  if (project.shareVersion !== payload.shareVersion) return null;

  return getProjectByIdOrSlug(project.id);
}

export async function updateProjectShareSettings(
  projectIdOrSlug: string,
  options: { shareEnabled?: boolean; rotateToken?: boolean }
): Promise<EnrichedProject | null> {
  await ensureDatabaseReady();
  const project = await getProjectByIdOrSlug(projectIdOrSlug);
  if (!project) return null;

  const rows = await db
    .select()
    .from(schema.projects)
    .where(eq(schema.projects.id, project.id));
  const current = rows[0];
  if (!current) return null;

  const newShareEnabled =
    options.shareEnabled !== undefined
      ? options.shareEnabled
      : current.shareEnabled;
  const newShareVersion = options.rotateToken
    ? `v_${crypto.randomBytes(6).toString("hex")}`
    : current.shareVersion;

  await db
    .update(schema.projects)
    .set({
      shareEnabled: newShareEnabled,
      shareVersion: newShareVersion,
      updatedAt: new Date(),
    })
    .where(eq(schema.projects.id, project.id));

  return getProjectByIdOrSlug(project.id);
}

export async function getFeatureByIdOrSlug(
  featureIdOrSlug: string,
  projectId?: string
): Promise<EnrichedFeature | null> {
  await ensureDatabaseReady();
  let feature = (
    await db
      .select()
      .from(schema.features)
      .where(eq(schema.features.id, featureIdOrSlug))
  )[0];

  if (!feature) {
    const query = projectId
      ? and(
          eq(schema.features.slug, featureIdOrSlug),
          eq(schema.features.projectId, projectId)
        )
      : eq(schema.features.slug, featureIdOrSlug);
    feature = (await db.select().from(schema.features).where(query))[0];
  }

  if (!feature) return null;

  const stages = await db
    .select()
    .from(schema.featureStages)
    .where(eq(schema.featureStages.featureId, feature.id))
    .orderBy(asc(schema.featureStages.sortOrder));

  const links = await db
    .select()
    .from(schema.stageLinks)
    .where(eq(schema.stageLinks.featureId, feature.id))
    .orderBy(asc(schema.stageLinks.createdAt));

  const enrichedStages: EnrichedStage[] = stages.map((s) => ({
    id: s.id,
    featureId: s.featureId,
    name: s.name,
    sortOrder: s.sortOrder,
    status: s.status,
    owner: s.owner,
    plannedStartDate: s.plannedStartDate,
    plannedEndDate: s.plannedEndDate,
    actualStartDate: s.actualStartDate,
    actualEndDate: s.actualEndDate,
    agentInstructions: s.agentInstructions,
    proactiveTrigger: s.proactiveTrigger,
    notes: s.notes,
    links: links
      .filter((l) => l.stageId === s.id)
      .map((l) => ({
        id: l.id,
        label: l.label,
        url: l.url,
        linkType: l.linkType,
        createdBy: l.createdBy,
      })),
  }));

  const fourQuestions = computeFourQuestions(feature, enrichedStages);

  return {
    id: feature.id,
    projectId: feature.projectId,
    slug: feature.slug,
    title: feature.title,
    summary: feature.summary,
    status: feature.status,
    priority: feature.priority,
    currentStageId: feature.currentStageId,
    currentOwner: feature.currentOwner,
    targetDate: feature.targetDate,
    expectedDate: feature.expectedDate,
    fourQuestions,
    stages: enrichedStages,
    links: links.map((l) => ({
      id: l.id,
      stageId: l.stageId,
      label: l.label,
      url: l.url,
      linkType: l.linkType,
      createdBy: l.createdBy,
    })),
    updatedAt: feature.updatedAt.toISOString(),
  };
}

function slugify(input: string): string {
  return input
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 48);
}

export async function createProject(input: {
  name: string;
  description?: string;
  slug?: string;
  defaultStages?: schema.StageTemplateItem[];
  actorName?: string;
  actorType?: "agent" | "human";
}): Promise<EnrichedProject> {
  await ensureDatabaseReady();
  const id = `proj_${crypto.randomBytes(5).toString("hex")}`;
  const baseSlug = slugify(input.slug || input.name || "project");
  const existing = await getProjectByIdOrSlug(baseSlug);
  const slug = existing
    ? `${baseSlug}-${crypto.randomBytes(2).toString("hex")}`
    : baseSlug;

  await db.insert(schema.projects).values({
    id,
    ownerId: DEFAULT_USER_ID,
    slug,
    name: input.name,
    description: input.description ?? "",
    shareEnabled: true,
    shareVersion: `v_${crypto.randomBytes(4).toString("hex")}`,
    defaultStages:
      input.defaultStages && input.defaultStages.length > 0
        ? input.defaultStages
        : schema.DEFAULT_ARCHITECT_STAGES,
  });

  await db.insert(schema.activityLogs).values({
    id: `act_${crypto.randomBytes(5).toString("hex")}`,
    projectId: id,
    actorType: input.actorType ?? "agent",
    actorName: input.actorName ?? "Architect",
    action: "Created Project",
    details: `Initialized project '${input.name}' (${slug}).`,
  });

  const created = await getProjectByIdOrSlug(id);
  if (!created) throw new Error("Failed to load created project");
  return created;
}

export interface CreateFeatureInput {
  projectIdOrSlug: string;
  title: string;
  slug?: string;
  summary?: string;
  currentOwner?: string;
  targetDate?: string;
  expectedDate?: string;
  priority?: string;
  initialStageName?: string;
  customStages?: Array<{
    name: string;
    owner?: string;
    plannedStartDate?: string;
    plannedEndDate?: string;
    agentInstructions?: string;
    proactiveTrigger?: string;
  }>;
  links?: Array<{
    label: string;
    url: string;
    linkType?: string;
  }>;
  actorName?: string;
  actorType?: "agent" | "human";
}

export async function createFeatureWithFlow(
  input: CreateFeatureInput
): Promise<EnrichedFeature> {
  await ensureDatabaseReady();
  const project = await getProjectByIdOrSlug(input.projectIdOrSlug);
  if (!project) {
    throw new Error(`Project '${input.projectIdOrSlug}' not found.`);
  }

  const featureId = `feat_${crypto.randomBytes(5).toString("hex")}`;
  const slug =
    slugify(input.slug || input.title) ||
    `feature-${crypto.randomBytes(2).toString("hex")}`;

  const stageTemplates =
    input.customStages && input.customStages.length > 0
      ? input.customStages.map((cs, i) => ({
          name: cs.name,
          defaultOwnerRole: cs.owner || input.currentOwner || "Architect / Dev",
          plannedStartDate: cs.plannedStartDate,
          plannedEndDate: cs.plannedEndDate,
          agentInstructions:
            cs.agentInstructions ||
            schema.DEFAULT_ARCHITECT_STAGES[i]?.agentInstructions ||
            "Complete milestone deliverables and update KAZOR flowchart.",
          proactiveTrigger:
            cs.proactiveTrigger ||
            schema.DEFAULT_ARCHITECT_STAGES[i]?.proactiveTrigger ||
            "When this milestone is reached, ask the user: 'Would you like to update the KAZOR flowchart?'",
        }))
      : project.defaultStages.map((ds) => ({
          ...ds,
          plannedStartDate: undefined,
          plannedEndDate: undefined,
        }));

  const today = todayIsoDate();
  const stageRows: Array<typeof schema.featureStages.$inferInsert> = [];

  let activeIndex = 0;
  if (input.initialStageName) {
    const foundIdx = stageTemplates.findIndex(
      (s) => s.name.toLowerCase() === input.initialStageName!.toLowerCase()
    );
    if (foundIdx >= 0) activeIndex = foundIdx;
  }

  for (let i = 0; i < stageTemplates.length; i++) {
    const st = stageTemplates[i];
    const stageId = `stg_${crypto.randomBytes(5).toString("hex")}`;
    const isCompleted = i < activeIndex;
    const isCurrent = i === activeIndex;

    const plannedStart = st.plannedStartDate || addDaysIso(today, i * 3);
    const plannedEnd = st.plannedEndDate || addDaysIso(today, (i + 1) * 3);

    stageRows.push({
      id: stageId,
      featureId,
      name: st.name,
      sortOrder: i,
      status: isCompleted ? "completed" : isCurrent ? "in_progress" : "pending",
      owner:
        isCurrent && input.currentOwner
          ? input.currentOwner
          : st.defaultOwnerRole,
      plannedStartDate: plannedStart,
      plannedEndDate: plannedEnd,
      actualStartDate: isCompleted || isCurrent ? today : null,
      actualEndDate: isCompleted ? today : null,
      agentInstructions: st.agentInstructions,
      proactiveTrigger: st.proactiveTrigger,
      notes: isCurrent ? "Initialized stage." : "",
    });
  }

  const currentStageId = stageRows[activeIndex]?.id ?? null;
  const defaultTargetDate =
    input.targetDate || addDaysIso(today, stageTemplates.length * 3);
  const defaultExpectedDate = input.expectedDate || defaultTargetDate;

  await db.insert(schema.features).values({
    id: featureId,
    projectId: project.id,
    slug,
    title: input.title,
    summary: input.summary ?? "",
    currentStageId,
    currentOwner:
      input.currentOwner ||
      stageRows[activeIndex]?.owner ||
      "Lead Architect",
    targetDate: defaultTargetDate,
    expectedDate: defaultExpectedDate,
    status: "active",
    priority: input.priority || "high",
  });

  for (const row of stageRows) {
    await db.insert(schema.featureStages).values(row);
  }

  if (input.links && input.links.length > 0) {
    for (const l of input.links) {
      await db.insert(schema.stageLinks).values({
        id: `lnk_${crypto.randomBytes(5).toString("hex")}`,
        featureId,
        stageId: currentStageId,
        label: l.label,
        url: l.url,
        linkType: l.linkType || inferLinkType(l.url, l.label),
        createdBy: input.actorName || "Coding Agent",
      });
    }
  }

  await db.insert(schema.activityLogs).values({
    id: `act_${crypto.randomBytes(5).toString("hex")}`,
    projectId: project.id,
    featureId,
    actorType: input.actorType ?? "agent",
    actorName: input.actorName ?? "Coding Agent",
    action: "Created Feature Flowchart",
    details: `Created '${input.title}' at stage '${stageRows[activeIndex]?.name}' (Owner: ${input.currentOwner || "Architect"}, Target: ${defaultTargetDate}).`,
  });

  const enriched = await getFeatureByIdOrSlug(featureId);
  if (!enriched) throw new Error("Failed to load created feature");
  return enriched;
}

function inferLinkType(url: string, label: string): string {
  const combined = `${url} ${label}`.toLowerCase();
  if (combined.includes("design.md") || combined.includes("rfc") || combined.includes("spec")) {
    return "design_doc";
  }
  if (combined.includes("github.com") || combined.includes("pull") || combined.includes("pr")) {
    return "github";
  }
  if (combined.includes("trello.com")) {
    return "trello";
  }
  if (
    combined.includes("staging") ||
    combined.includes("preview") ||
    combined.includes("vercel.app") ||
    combined.includes("demo")
  ) {
    return "preview_url";
  }
  return "other";
}

export interface UpdateFeatureStatusInput {
  featureIdOrSlug: string;
  // Transition control
  action?: "advance" | "set_stage" | "complete_feature" | "reopen";
  stageId?: string;
  stageName?: string;
  // The 4 Core Questions updates
  currentOwner?: string;
  targetDate?: string;
  expectedDate?: string;
  // Optional metadata updates
  title?: string;
  summary?: string;
  priority?: string;
  status?: string;
  notes?: string;
  plannedStartDate?: string;
  plannedEndDate?: string;
  actualStartDate?: string;
  actualEndDate?: string;
  // Attach resource links (e.g. design.md, GitHub PR, staging URL, Trello)
  links?: Array<{
    label: string;
    url: string;
    linkType?: string;
    stageId?: string;
  }>;
  actorName?: string;
  actorType?: "agent" | "human";
}

export async function updateFeatureStatus(
  input: UpdateFeatureStatusInput
): Promise<EnrichedFeature> {
  await ensureDatabaseReady();
  const feature = await getFeatureByIdOrSlug(input.featureIdOrSlug);
  if (!feature) {
    throw new Error(`Feature '${input.featureIdOrSlug}' not found.`);
  }

  const today = todayIsoDate();
  const stages = feature.stages;
  let targetStage = stages.find((s) => s.id === feature.currentStageId) || stages[0];

  const actionSummaryParts: string[] = [];

  if (input.action === "advance") {
    const currentIdx = stages.findIndex((s) => s.id === targetStage?.id);
    const nextIdx = Math.min(currentIdx + 1, stages.length - 1);
    targetStage = stages[nextIdx];
    actionSummaryParts.push(`Advanced to '${targetStage.name}'`);
  } else if (input.stageId || input.stageName) {
    const matched = stages.find(
      (s) =>
        s.id === input.stageId ||
        (input.stageName &&
          s.name.toLowerCase() === input.stageName.toLowerCase()) ||
        (input.stageName &&
          s.name.toLowerCase().includes(input.stageName.toLowerCase()))
    );
    if (matched) {
      targetStage = matched;
      actionSummaryParts.push(`Moved to stage '${targetStage.name}'`);
    }
  }

  const newStageIdx = stages.findIndex((s) => s.id === targetStage?.id);

  // If transitioning stage or completing feature, update stage statuses & actual dates for Gantt
  if (
    input.action === "advance" ||
    input.action === "set_stage" ||
    input.stageId ||
    input.stageName ||
    input.action === "complete_feature"
  ) {
    for (let i = 0; i < stages.length; i++) {
      const s = stages[i];
      if (input.action === "complete_feature" || i < newStageIdx) {
        await db
          .update(schema.featureStages)
          .set({
            status: "completed",
            actualStartDate: s.actualStartDate || today,
            actualEndDate: s.actualEndDate || today,
            updatedAt: new Date(),
          })
          .where(eq(schema.featureStages.id, s.id));
      } else if (i === newStageIdx) {
        await db
          .update(schema.featureStages)
          .set({
            status: "in_progress",
            owner: input.currentOwner || s.owner || feature.currentOwner,
            actualStartDate: input.actualStartDate || s.actualStartDate || today,
            actualEndDate: input.actualEndDate ?? null,
            plannedStartDate: input.plannedStartDate ?? s.plannedStartDate,
            plannedEndDate: input.plannedEndDate ?? s.plannedEndDate,
            notes: input.notes !== undefined ? input.notes : s.notes,
            updatedAt: new Date(),
          })
          .where(eq(schema.featureStages.id, s.id));
      } else {
        await db
          .update(schema.featureStages)
          .set({
            status: "pending",
            updatedAt: new Date(),
          })
          .where(eq(schema.featureStages.id, s.id));
      }
    }
  } else if (targetStage && (input.notes !== undefined || input.plannedStartDate || input.plannedEndDate || input.actualStartDate || input.actualEndDate || input.currentOwner)) {
    await db
      .update(schema.featureStages)
      .set({
        notes: input.notes !== undefined ? input.notes : targetStage.notes,
        owner: input.currentOwner || targetStage.owner,
        plannedStartDate: input.plannedStartDate ?? targetStage.plannedStartDate,
        plannedEndDate: input.plannedEndDate ?? targetStage.plannedEndDate,
        actualStartDate: input.actualStartDate ?? targetStage.actualStartDate,
        actualEndDate: input.actualEndDate ?? targetStage.actualEndDate,
        updatedAt: new Date(),
      })
      .where(eq(schema.featureStages.id, targetStage.id));
  }

  const updatedOwner =
    input.currentOwner || targetStage?.owner || feature.currentOwner;
  const updatedTargetDate =
    input.targetDate !== undefined ? input.targetDate : feature.targetDate;
  const updatedExpectedDate =
    input.expectedDate !== undefined ? input.expectedDate : feature.expectedDate;
  const isFinalStage =
    input.action === "complete_feature" ||
    (newStageIdx === stages.length - 1 &&
      targetStage?.name.toLowerCase().includes("production") &&
      input.status === "completed");

  if (input.currentOwner && input.currentOwner !== feature.currentOwner) {
    actionSummaryParts.push(`Owner → ${input.currentOwner}`);
  }
  if (input.targetDate && input.targetDate !== feature.targetDate) {
    actionSummaryParts.push(`Target Date → ${input.targetDate}`);
  }
  if (input.expectedDate && input.expectedDate !== feature.expectedDate) {
    actionSummaryParts.push(`Expected Date → ${input.expectedDate}`);
  }

  await db
    .update(schema.features)
    .set({
      title: input.title ?? feature.title,
      summary: input.summary ?? feature.summary,
      priority: input.priority ?? feature.priority,
      currentStageId: targetStage?.id ?? feature.currentStageId,
      currentOwner: updatedOwner,
      targetDate: updatedTargetDate,
      expectedDate: updatedExpectedDate,
      status: isFinalStage ? "completed" : input.status ?? feature.status,
      updatedAt: new Date(),
    })
    .where(eq(schema.features.id, feature.id));

  if (input.links && input.links.length > 0) {
    for (const l of input.links) {
      await db.insert(schema.stageLinks).values({
        id: `lnk_${crypto.randomBytes(5).toString("hex")}`,
        featureId: feature.id,
        stageId: l.stageId || targetStage?.id || feature.currentStageId,
        label: l.label,
        url: l.url,
        linkType: l.linkType || inferLinkType(l.url, l.label),
        createdBy: input.actorName || "Coding Agent",
      });
      actionSummaryParts.push(`Attached link '${l.label}'`);
    }
  }

  if (input.notes) {
    actionSummaryParts.push(`Note: "${input.notes}"`);
  }

  await db.insert(schema.activityLogs).values({
    id: `act_${crypto.randomBytes(5).toString("hex")}`,
    projectId: feature.projectId,
    featureId: feature.id,
    actorType: input.actorType ?? "agent",
    actorName: input.actorName ?? "Coding Agent",
    action: actionSummaryParts[0] || "Updated Feature Status",
    details:
      actionSummaryParts.join(" | ") ||
      `Updated '${feature.title}' status and timeline.`,
  });

  const refreshed = await getFeatureByIdOrSlug(feature.id);
  if (!refreshed) throw new Error("Failed to reload updated feature");
  return refreshed;
}

export async function listApiKeys() {
  await ensureDatabaseReady();
  return db
    .select()
    .from(schema.apiKeys)
    .orderBy(desc(schema.apiKeys.createdAt));
}

export async function createNewApiKey(name: string) {
  await ensureDatabaseReady();
  const { rawKey, keyHash, keyPrefix } = generateApiKey();
  const id = `key_${crypto.randomBytes(5).toString("hex")}`;

  await db.insert(schema.apiKeys).values({
    id,
    userId: DEFAULT_USER_ID,
    name: name.trim() || "Coding Agent Skill Key",
    keyHash,
    keyPrefix,
  });

  return { id, name, rawKey, keyPrefix };
}

export async function authenticateAgentRequest(
  authHeader: string | null
): Promise<{ valid: boolean; keyName: string }> {
  await ensureDatabaseReady();
  if (!authHeader) {
    return { valid: false, keyName: "Unauthenticated" };
  }

  const token = authHeader.replace(/^Bearer\s+/i, "").trim();
  if (!token) {
    return { valid: false, keyName: "Unauthenticated" };
  }

  const hashed = hashApiKey(token);
  const found = await db
    .select()
    .from(schema.apiKeys)
    .where(eq(schema.apiKeys.keyHash, hashed));

  if (found.length === 0) {
    return { valid: false, keyName: "Invalid Key" };
  }

  await db
    .update(schema.apiKeys)
    .set({ lastUsedAt: new Date() })
    .where(eq(schema.apiKeys.id, found[0].id));

  return { valid: true, keyName: found[0].name };
}
