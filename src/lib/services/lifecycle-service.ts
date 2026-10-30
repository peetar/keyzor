import crypto from "crypto";
import { eq, asc, desc, and, inArray, sql } from "drizzle-orm";
import { db, ensureDatabaseReady } from "@/db";
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

export interface ProjectCollaboratorInfo {
  id: string;
  userId: string;
  name: string;
  email: string;
  image: string | null;
  role: "owner" | "editor";
  joinedAt: string;
}

export interface ProjectAccessRequestInfo {
  id: string;
  projectId: string;
  userId: string;
  userName: string;
  userEmail: string;
  userImage: string | null;
  status: string;
  createdAt: string;
}

export interface EnrichedProject {
  id: string;
  ownerId: string;
  ownerName?: string;
  ownerEmail?: string;
  userRole?: "owner" | "editor" | null;
  slug: string;
  name: string;
  description: string;
  shareEnabled: boolean;
  encryptedShareToken: string;
  inviteCode?: string;
  collaborators?: ProjectCollaboratorInfo[];
  pendingRequests?: ProjectAccessRequestInfo[];
  pendingRequestsCount?: number;
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

function generateInviteCode(): string {
  const chars = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ";
  let code = "KZ-";
  for (let i = 0; i < 5; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

export async function listProjects(forUserId?: string): Promise<EnrichedProject[]> {
  await ensureDatabaseReady();
  if (!forUserId) {
    return [];
  }

  let allProjects: Array<typeof schema.projects.$inferSelect> = [];

  const owned = await db
    .select()
    .from(schema.projects)
    .where(eq(schema.projects.ownerId, forUserId));

  const memberCollabs = await db
    .select({ projectId: schema.projectCollaborators.projectId })
    .from(schema.projectCollaborators)
    .where(eq(schema.projectCollaborators.userId, forUserId));

  const memberIds = memberCollabs.map((m) => m.projectId);
  let memberProjects: Array<typeof schema.projects.$inferSelect> = [];
  if (memberIds.length > 0) {
    memberProjects = await db
      .select()
      .from(schema.projects)
      .where(inArray(schema.projects.id, memberIds));
  }

  const map = new Map<string, typeof schema.projects.$inferSelect>();
  for (const p of owned) map.set(p.id, p);
  for (const p of memberProjects) map.set(p.id, p);
  allProjects = Array.from(map.values()).sort(
    (a, b) => a.createdAt.getTime() - b.createdAt.getTime()
  );

  const results: EnrichedProject[] = [];
  for (const p of allProjects) {
    const enriched = await getProjectByIdOrSlug(p.id, forUserId);
    if (enriched) results.push(enriched);
  }
  return results;
}

export async function getProjectByIdOrSlug(
  idOrSlug: string,
  forUserId?: string
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

  // Fetch owner info
  const ownerRows = await db
    .select()
    .from(schema.users)
    .where(eq(schema.users.id, project.ownerId));
  const owner = ownerRows[0];

  // Fetch collaborators
  const collabRows = await db
    .select({
      id: schema.projectCollaborators.id,
      userId: schema.projectCollaborators.userId,
      role: schema.projectCollaborators.role,
      joinedAt: schema.projectCollaborators.joinedAt,
      userName: schema.users.name,
      userEmail: schema.users.email,
      userImage: schema.users.image,
    })
    .from(schema.projectCollaborators)
    .leftJoin(
      schema.users,
      eq(schema.projectCollaborators.userId, schema.users.id)
    )
    .where(eq(schema.projectCollaborators.projectId, project.id));

  const collaborators: ProjectCollaboratorInfo[] = [
    {
      id: `owner_${project.ownerId}`,
      userId: project.ownerId,
      name: owner?.name || "Project Owner",
      email: owner?.email || "",
      image: owner?.image || null,
      role: "owner",
      joinedAt: project.createdAt.toISOString(),
    },
    ...collabRows.map((c) => ({
      id: c.id,
      userId: c.userId,
      name: c.userName || c.userEmail || "Collaborator",
      email: c.userEmail || "",
      image: c.userImage || null,
      role: (c.role as "owner" | "editor") || "editor",
      joinedAt: c.joinedAt.toISOString(),
    })),
  ];

  // Active invite code
  const inviteRows = await db
    .select()
    .from(schema.projectInvites)
    .where(
      and(
        eq(schema.projectInvites.projectId, project.id),
        eq(schema.projectInvites.isActive, true)
      )
    )
    .orderBy(desc(schema.projectInvites.createdAt))
    .limit(1);

  // Determine userRole
  let userRole: "owner" | "editor" | null = null;
  if (forUserId) {
    if (forUserId === project.ownerId) {
      userRole = "owner";
    } else if (collabRows.some((c) => c.userId === forUserId)) {
      userRole = "editor";
    }
  } else {
    userRole = null;
  }

  // If a specific userId was requested and the user has neither owner nor editor role, deny access
  if (forUserId && !userRole) {
    return null;
  }

  let inviteCode = inviteRows[0]?.code;
  if (!inviteCode && userRole === "owner") {
    inviteCode = generateInviteCode();
    await db.insert(schema.projectInvites).values({
      id: `inv_${crypto.randomBytes(5).toString("hex")}`,
      projectId: project.id,
      code: inviteCode,
      createdBy: project.ownerId,
      isActive: true,
      usesCount: 0,
    });
  }

  if (userRole !== "owner") {
    inviteCode = "";
  }

  // Pending requests if owner
  let pendingRequests: ProjectAccessRequestInfo[] = [];
  if (userRole === "owner") {
    const reqRows = await db
      .select({
        id: schema.projectAccessRequests.id,
        projectId: schema.projectAccessRequests.projectId,
        userId: schema.projectAccessRequests.userId,
        status: schema.projectAccessRequests.status,
        createdAt: schema.projectAccessRequests.createdAt,
        userName: schema.users.name,
        userEmail: schema.users.email,
        userImage: schema.users.image,
      })
      .from(schema.projectAccessRequests)
      .leftJoin(
        schema.users,
        eq(schema.projectAccessRequests.userId, schema.users.id)
      )
      .where(
        and(
          eq(schema.projectAccessRequests.projectId, project.id),
          eq(schema.projectAccessRequests.status, "pending")
        )
      )
      .orderBy(desc(schema.projectAccessRequests.createdAt));

    pendingRequests = reqRows.map((r) => ({
      id: r.id,
      projectId: r.projectId,
      userId: r.userId,
      userName: r.userName || r.userEmail || "User",
      userEmail: r.userEmail || "",
      userImage: r.userImage || null,
      status: r.status,
      createdAt: r.createdAt.toISOString(),
    }));
  }

  return {
    id: project.id,
    ownerId: project.ownerId,
    ownerName: owner?.name || "Project Owner",
    ownerEmail: owner?.email || "",
    userRole,
    slug: project.slug,
    name: project.name,
    description: project.description,
    shareEnabled: project.shareEnabled,
    encryptedShareToken: createEncryptedShareToken(
      project.id,
      project.shareVersion
    ),
    inviteCode,
    collaborators,
    pendingRequests,
    pendingRequestsCount: pendingRequests.length,
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
  ownerId?: string;
}): Promise<EnrichedProject> {
  await ensureDatabaseReady();
  const id = `proj_${crypto.randomBytes(5).toString("hex")}`;
  const baseSlug = slugify(input.slug || input.name || "project");
  const existing = await getProjectByIdOrSlug(baseSlug);
  const slug = existing
    ? `${baseSlug}-${crypto.randomBytes(2).toString("hex")}`
    : baseSlug;

  if (!input.ownerId) {
    throw new Error("Field 'ownerId' is required to create a project.");
  }
  const ownerId = input.ownerId;

  await db.insert(schema.projects).values({
    id,
    ownerId,
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

  const inviteCode = generateInviteCode();
  await db.insert(schema.projectInvites).values({
    id: `inv_${crypto.randomBytes(5).toString("hex")}`,
    projectId: id,
    code: inviteCode,
    createdBy: ownerId,
    isActive: true,
    usesCount: 0,
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
  stageName?: string;
  initialStage?: string;
  initialStageName?: string;
  status?: string;
  notes?: string;
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
            "Complete milestone deliverables and update KEYZOR flowchart.",
          proactiveTrigger:
            cs.proactiveTrigger ||
            schema.DEFAULT_ARCHITECT_STAGES[i]?.proactiveTrigger ||
            "When this milestone is reached, ask the user: 'Would you like to update the KEYZOR flowchart?'",
        }))
      : project.defaultStages.map((ds) => ({
          ...ds,
          plannedStartDate: undefined,
          plannedEndDate: undefined,
        }));

  const today = todayIsoDate();
  const stageRows: Array<typeof schema.featureStages.$inferInsert> = [];

  const requestedStageName =
    input.stageName || input.initialStage || input.initialStageName;
  const isFeatureCompleted = input.status === "completed";

  let activeIndex = isFeatureCompleted
    ? Math.max(0, stageTemplates.length - 1)
    : 0;
  if (requestedStageName) {
    const exactIdx = stageTemplates.findIndex(
      (s) => s.name.toLowerCase() === requestedStageName.toLowerCase()
    );
    const partialIdx =
      exactIdx >= 0
        ? exactIdx
        : stageTemplates.findIndex((s) =>
            s.name.toLowerCase().includes(requestedStageName.toLowerCase())
          );
    if (partialIdx >= 0) activeIndex = partialIdx;
  }

  for (let i = 0; i < stageTemplates.length; i++) {
    const st = stageTemplates[i];
    const stageId = `stg_${crypto.randomBytes(5).toString("hex")}`;
    const isCurrent = i === activeIndex;
    const isCompleted =
      i < activeIndex || (isCurrent && isFeatureCompleted);

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
      notes: isCurrent ? input.notes || "Initialized stage." : "",
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
    status: isFeatureCompleted ? "completed" : input.status || "active",
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
    details: `Created '${input.title}' at stage '${stageRows[activeIndex]?.name}' (Status: ${
      isFeatureCompleted ? "completed" : input.status || "active"
    }, Owner: ${input.currentOwner || "Architect"}, Target: ${defaultTargetDate})${
      input.notes ? ` — Note: "${input.notes}"` : ""
    }.`,
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
  } else if (input.action === "complete_feature" && stages.length > 0) {
    targetStage = stages[stages.length - 1];
    actionSummaryParts.push(`Completed feature at '${targetStage.name}'`);
  }

  const newStageIdx = stages.findIndex((s) => s.id === targetStage?.id);
  const isMarkingCompleted =
    input.action === "complete_feature" || input.status === "completed";

  // If transitioning stage or completing feature, update stage statuses & actual dates for Gantt
  if (
    input.action === "advance" ||
    input.action === "set_stage" ||
    input.stageId ||
    input.stageName ||
    isMarkingCompleted
  ) {
    for (let i = 0; i < stages.length; i++) {
      const s = stages[i];
      if (i < newStageIdx || (input.action === "complete_feature" && i < stages.length - 1)) {
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
            status: isMarkingCompleted ? "completed" : "in_progress",
            owner: input.currentOwner || s.owner || feature.currentOwner,
            actualStartDate: input.actualStartDate || s.actualStartDate || today,
            actualEndDate: isMarkingCompleted
              ? input.actualEndDate || s.actualEndDate || today
              : input.actualEndDate ?? null,
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
    isMarkingCompleted ||
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
  if (isFinalStage && feature.status !== "completed") {
    actionSummaryParts.push(`Status → completed (100%)`);
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

export async function listApiKeys(userId?: string) {
  await ensureDatabaseReady();
  if (!userId) {
    return [];
  }

  return db
    .select()
    .from(schema.apiKeys)
    .where(eq(schema.apiKeys.userId, userId))
    .orderBy(desc(schema.apiKeys.createdAt));
}

export async function createNewApiKey(name: string, userId?: string) {
  await ensureDatabaseReady();
  if (!userId) {
    throw new Error("Field 'userId' is required to create an API key.");
  }
  const { rawKey, keyHash, keyPrefix } = generateApiKey();
  const id = `key_${crypto.randomBytes(5).toString("hex")}`;

  await db.insert(schema.apiKeys).values({
    id,
    userId,
    name: name.trim() || "Coding Agent Skill Key",
    keyHash,
    keyPrefix,
  });

  return { id, name, rawKey, keyPrefix };
}

export async function authenticateAgentRequest(
  authHeader: string | null
): Promise<{ valid: boolean; keyName: string; userId?: string }> {
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

  return { valid: true, keyName: found[0].name, userId: found[0].userId };
}

export async function getOrCreateUser(input: {
  email: string;
  name?: string | null;
  image?: string | null;
  provider?: string;
}): Promise<{
  id: string;
  email: string;
  name: string;
  image: string | null;
  provider: string;
}> {
  await ensureDatabaseReady();
  const normalizedEmail = input.email.trim().toLowerCase();
  const existing = await db
    .select()
    .from(schema.users)
    .where(eq(schema.users.email, normalizedEmail));

  if (existing.length > 0) {
    const user = existing[0];
    if (input.name && input.name !== user.name) {
      await db
        .update(schema.users)
        .set({ name: input.name, image: input.image ?? user.image })
        .where(eq(schema.users.id, user.id));
      user.name = input.name;
    }
    return user;
  }

  const id = `usr_${crypto.randomBytes(6).toString("hex")}`;

  const newUser = {
    id,
    email: normalizedEmail,
    name: input.name?.trim() || "Software Architect",
    image: input.image ?? null,
    provider: input.provider || "oauth",
  };

  await db.insert(schema.users).values(newUser);
  return newUser;
}

export async function getProjectPermission(
  projectIdOrSlug: string,
  userId: string
): Promise<{
  hasAccess: boolean;
  role: "owner" | "editor" | null;
  project: typeof schema.projects.$inferSelect | null;
}> {
  await ensureDatabaseReady();
  const rows = await db
    .select()
    .from(schema.projects)
    .where(eq(schema.projects.slug, projectIdOrSlug));
  const project =
    rows[0] ??
    (
      await db
        .select()
        .from(schema.projects)
        .where(eq(schema.projects.id, projectIdOrSlug))
    )[0];

  if (!project) {
    return { hasAccess: false, role: null, project: null };
  }

  if (project.ownerId === userId) {
    return { hasAccess: true, role: "owner", project };
  }

  const membership = await db
    .select()
    .from(schema.projectCollaborators)
    .where(
      and(
        eq(schema.projectCollaborators.projectId, project.id),
        eq(schema.projectCollaborators.userId, userId)
      )
    );

  if (membership.length > 0) {
    return { hasAccess: true, role: "editor", project };
  }

  return { hasAccess: false, role: null, project };
}

export async function getOrCreateProjectInvite(
  projectIdOrSlug: string,
  userId: string
): Promise<{ code: string }> {
  await ensureDatabaseReady();
  const perm = await getProjectPermission(projectIdOrSlug, userId);
  if (!perm.project || !perm.hasAccess) {
    throw new Error("Project not found or unauthorized.");
  }

  const activeInvites = await db
    .select()
    .from(schema.projectInvites)
    .where(
      and(
        eq(schema.projectInvites.projectId, perm.project.id),
        eq(schema.projectInvites.isActive, true)
      )
    );

  if (activeInvites.length > 0) {
    return { code: activeInvites[0].code };
  }

  const code = generateInviteCode();
  await db.insert(schema.projectInvites).values({
    id: `inv_${crypto.randomBytes(5).toString("hex")}`,
    projectId: perm.project.id,
    code,
    createdBy: userId,
    isActive: true,
    usesCount: 0,
  });

  return { code };
}

export async function rotateProjectInvite(
  projectIdOrSlug: string,
  userId: string
): Promise<{ code: string }> {
  await ensureDatabaseReady();
  const perm = await getProjectPermission(projectIdOrSlug, userId);
  if (!perm.project || perm.role !== "owner") {
    throw new Error("Only the project owner can rotate the invite code.");
  }

  await db
    .update(schema.projectInvites)
    .set({ isActive: false })
    .where(eq(schema.projectInvites.projectId, perm.project.id));

  const code = generateInviteCode();
  await db.insert(schema.projectInvites).values({
    id: `inv_${crypto.randomBytes(5).toString("hex")}`,
    projectId: perm.project.id,
    code,
    createdBy: userId,
    isActive: true,
    usesCount: 0,
  });

  await db.insert(schema.activityLogs).values({
    id: `act_${crypto.randomBytes(5).toString("hex")}`,
    projectId: perm.project.id,
    actorType: "human",
    actorName: "Project Owner",
    action: "Rotated Invite Code",
    details: `Generated new invite code ${code}.`,
  });

  return { code };
}

export async function joinProjectWithCode(
  code: string,
  user: { id: string; name: string; email: string }
): Promise<EnrichedProject> {
  await ensureDatabaseReady();
  const cleanCode = code.trim().toUpperCase();

  const invites = await db
    .select()
    .from(schema.projectInvites)
    .where(
      and(
        eq(schema.projectInvites.code, cleanCode),
        eq(schema.projectInvites.isActive, true)
      )
    );

  if (invites.length === 0) {
    throw new Error("Invalid, expired, or revoked invite code.");
  }

  const invite = invites[0];
  const project = (
    await db
      .select()
      .from(schema.projects)
      .where(eq(schema.projects.id, invite.projectId))
  )[0];

  if (!project) throw new Error("Project no longer exists.");

  // If user is owner, they already have access
  if (project.ownerId === user.id) {
    const enriched = await getProjectByIdOrSlug(project.id, user.id);
    if (!enriched) throw new Error("Failed to load project.");
    return enriched;
  }

  // Check if user is already a collaborator
  const existingMember = await db
    .select()
    .from(schema.projectCollaborators)
    .where(
      and(
        eq(schema.projectCollaborators.projectId, project.id),
        eq(schema.projectCollaborators.userId, user.id)
      )
    );

  if (existingMember.length === 0) {
    await db.insert(schema.projectCollaborators).values({
      id: `collab_${crypto.randomBytes(5).toString("hex")}`,
      projectId: project.id,
      userId: user.id,
      role: "editor",
      invitedBy: invite.createdBy,
    });

    await db
      .update(schema.projectInvites)
      .set({ usesCount: invite.usesCount + 1 })
      .where(eq(schema.projectInvites.id, invite.id));

    // Clear any pending access request for this user on this project
    await db
      .update(schema.projectAccessRequests)
      .set({ status: "approved", reviewedAt: new Date() })
      .where(
        and(
          eq(schema.projectAccessRequests.projectId, project.id),
          eq(schema.projectAccessRequests.userId, user.id),
          eq(schema.projectAccessRequests.status, "pending")
        )
      );

    await db.insert(schema.activityLogs).values({
      id: `act_${crypto.randomBytes(5).toString("hex")}`,
      projectId: project.id,
      actorType: "human",
      actorName: user.name || user.email,
      action: "Joined Project",
      details: `${user.name || user.email} joined as a collaborator via invite code ${cleanCode}.`,
    });
  }

  const enriched = await getProjectByIdOrSlug(project.id, user.id);
  if (!enriched) throw new Error("Failed to load joined project.");
  return enriched;
}

export async function requestProjectAccess(
  projectIdOrSlug: string,
  user: { id: string; name: string; email: string }
): Promise<{ status: "pending" | "already_member"; message: string }> {
  await ensureDatabaseReady();
  const perm = await getProjectPermission(projectIdOrSlug, user.id);
  if (!perm.project) {
    throw new Error("Project not found.");
  }

  if (perm.hasAccess) {
    return {
      status: "already_member",
      message: "You already have collaborator access to this project.",
    };
  }

  const existing = await db
    .select()
    .from(schema.projectAccessRequests)
    .where(
      and(
        eq(schema.projectAccessRequests.projectId, perm.project.id),
        eq(schema.projectAccessRequests.userId, user.id),
        eq(schema.projectAccessRequests.status, "pending")
      )
    );

  if (existing.length > 0) {
    return {
      status: "pending",
      message: "Your request is already pending approval from the project owner.",
    };
  }

  await db.insert(schema.projectAccessRequests).values({
    id: `req_${crypto.randomBytes(5).toString("hex")}`,
    projectId: perm.project.id,
    userId: user.id,
    status: "pending",
  });

  await db.insert(schema.activityLogs).values({
    id: `act_${crypto.randomBytes(5).toString("hex")}`,
    projectId: perm.project.id,
    actorType: "human",
    actorName: user.name || user.email,
    action: "Requested Access",
    details: `${user.name || user.email} requested collaborator access.`,
  });

  return {
    status: "pending",
    message: "Access request submitted. The project owner can approve it in their dashboard.",
  };
}

export async function reviewProjectAccessRequest(
  requestId: string,
  action: "approved" | "rejected",
  reviewerUserId: string
): Promise<{ success: boolean; message: string }> {
  await ensureDatabaseReady();
  const requests = await db
    .select()
    .from(schema.projectAccessRequests)
    .where(eq(schema.projectAccessRequests.id, requestId));

  if (requests.length === 0) {
    throw new Error("Access request not found.");
  }

  const req = requests[0];
  const perm = await getProjectPermission(req.projectId, reviewerUserId);
  if (perm.role !== "owner") {
    throw new Error("Only the project owner can approve or reject access requests.");
  }

  await db
    .update(schema.projectAccessRequests)
    .set({
      status: action,
      reviewedBy: reviewerUserId,
      reviewedAt: new Date(),
    })
    .where(eq(schema.projectAccessRequests.id, requestId));

  if (action === "approved") {
    const existingMember = await db
      .select()
      .from(schema.projectCollaborators)
      .where(
        and(
          eq(schema.projectCollaborators.projectId, req.projectId),
          eq(schema.projectCollaborators.userId, req.userId)
        )
      );

    if (existingMember.length === 0) {
      await db.insert(schema.projectCollaborators).values({
        id: `collab_${crypto.randomBytes(5).toString("hex")}`,
        projectId: req.projectId,
        userId: req.userId,
        role: "editor",
        invitedBy: reviewerUserId,
      });
    }

    const targetUser = (
      await db
        .select()
        .from(schema.users)
        .where(eq(schema.users.id, req.userId))
    )[0];

    await db.insert(schema.activityLogs).values({
      id: `act_${crypto.randomBytes(5).toString("hex")}`,
      projectId: req.projectId,
      actorType: "human",
      actorName: "Project Owner",
      action: "Approved Access Request",
      details: `Approved collaborator access for ${targetUser?.name || targetUser?.email || "collaborator"}.`,
    });
  }

  return {
    success: true,
    message: `Request ${action} successfully.`,
  };
}

export async function removeProjectCollaborator(
  projectIdOrSlug: string,
  targetUserId: string,
  requestingUserId: string
): Promise<{ success: boolean }> {
  await ensureDatabaseReady();
  const perm = await getProjectPermission(projectIdOrSlug, requestingUserId);
  if (perm.role !== "owner") {
    throw new Error("Only the project owner can remove collaborators.");
  }
  if (!perm.project) throw new Error("Project not found.");
  if (perm.project.ownerId === targetUserId) {
    throw new Error("The project owner cannot be removed.");
  }

  await db
    .delete(schema.projectCollaborators)
    .where(
      and(
        eq(schema.projectCollaborators.projectId, perm.project.id),
        eq(schema.projectCollaborators.userId, targetUserId)
      )
    );

  await db.insert(schema.activityLogs).values({
    id: `act_${crypto.randomBytes(5).toString("hex")}`,
    projectId: perm.project.id,
    actorType: "human",
    actorName: "Project Owner",
    action: "Removed Collaborator",
    details: `Removed collaborator from project.`,
  });

  return { success: true };
}

export async function renameProject(
  projectIdOrSlug: string,
  newName: string,
  userId: string
): Promise<EnrichedProject> {
  await ensureDatabaseReady();
  const perm = await getProjectPermission(projectIdOrSlug, userId);
  if (perm.role !== "owner") {
    throw new Error("Only the project owner can rename the project.");
  }
  if (!perm.project) throw new Error("Project not found.");

  const trimmed = newName.trim();
  if (!trimmed) throw new Error("Project name cannot be empty.");

  await db
    .update(schema.projects)
    .set({ name: trimmed, updatedAt: new Date() })
    .where(eq(schema.projects.id, perm.project.id));

  await db.insert(schema.activityLogs).values({
    id: `act_${crypto.randomBytes(5).toString("hex")}`,
    projectId: perm.project.id,
    actorType: "human",
    actorName: "Project Owner",
    action: "Renamed Project",
    details: `Renamed project to '${trimmed}'.`,
  });

  const updated = await getProjectByIdOrSlug(perm.project.id, userId);
  if (!updated) throw new Error("Failed to load renamed project.");
  return updated;
}

export async function deleteProject(
  projectIdOrSlug: string,
  userId: string
): Promise<{ success: boolean; deletedSlug: string }> {
  await ensureDatabaseReady();
  const perm = await getProjectPermission(projectIdOrSlug, userId);
  if (perm.role !== "owner") {
    throw new Error("Only the project owner can delete this project.");
  }
  if (!perm.project) throw new Error("Project not found.");

  const slug = perm.project.slug;
  await db.delete(schema.projects).where(eq(schema.projects.id, perm.project.id));

  return { success: true, deletedSlug: slug };
}

