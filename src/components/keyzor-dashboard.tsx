"use client";

import React, { useState } from "react";
import type {
  EnrichedProject,
  EnrichedFeature,
  EnrichedStage,
} from "@/lib/services/lifecycle-service";
import {
  FourQuestionsCardRow,
  FeatureFlowchartView,
  FeatureGanttView,
  LinkBadge,
  ScheduleHealthBadge,
} from "./flowchart-gantt-views";
import {
  BarChart3,
  GitCommitHorizontal,
  Plus,
  Share2,
  Terminal,
  Copy,
  Check,
  RefreshCw,
  ShieldCheck,
  ExternalLink,
  Layers,
  Activity,
  X,
  LogOut,
  KeyRound,
  Sparkles,
  Users,
  Trash2,
  Edit2,
  AlertCircle,
  CheckCircle2,
  UserPlus,
  UserCheck,
  UserX,
  Lock,
} from "lucide-react";

interface KeyzorDashboardProps {
  initialProjects: EnrichedProject[];
  defaultApiKey: string;
  userEmail: string;
  userName: string;
  currentUserId?: string;
}

export function KeyzorDashboard({
  initialProjects,
  defaultApiKey,
  userEmail,
  userName,
  currentUserId,
}: KeyzorDashboardProps) {
  const [projects, setProjects] = useState<EnrichedProject[]>(initialProjects);
  const [selectedProjectId, setSelectedProjectId] = useState<string>(
    initialProjects[0]?.id || ""
  );
  const [viewMode, setViewMode] = useState<"gantt" | "flowchart" | "both">(
    "both"
  );
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Modals state
  const [showAgentModal, setShowAgentModal] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [showNewFeatureModal, setShowNewFeatureModal] = useState(false);
  const [showNewProjectModal, setShowNewProjectModal] = useState(false);

  // Sharing & Collaboration Modals & State
  const [showJoinModal, setShowJoinModal] = useState(false);
  const [joinModalTab, setJoinModalTab] = useState<"code" | "request">("code");
  const [joinCodeInput, setJoinCodeInput] = useState("");
  const [requestSlugInput, setRequestSlugInput] = useState("");
  const [joinMessage, setJoinMessage] = useState<string | null>(null);
  const [joinErrorMessage, setJoinErrorMessage] = useState<string | null>(null);

  const [shareModalTab, setShareModalTab] = useState<
    "collaborate" | "members" | "requests" | "stakeholder"
  >("collaborate");

  // Project Rename & Delete
  const [isEditingProjectName, setIsEditingProjectName] = useState(false);
  const [editProjectNameInput, setEditProjectNameInput] = useState("");
  const [showDeleteProjectConfirm, setShowDeleteProjectConfirm] = useState(false);

  // Active stage/feature quick editor
  const [editingFeature, setEditingFeature] = useState<EnrichedFeature | null>(
    null
  );
  const [editingStageId, setEditingStageId] = useState<string>("");
  const [editOwner, setEditOwner] = useState<string>("");
  const [editTargetDate, setEditTargetDate] = useState<string>("");
  const [editExpectedDate, setEditExpectedDate] = useState<string>("");
  const [editNotes, setEditNotes] = useState<string>("");
  const [editStartDate, setEditStartDate] = useState<string>("");
  const [editEndDate, setEditEndDate] = useState<string>("");
  const [newLinkLabel, setNewLinkLabel] = useState<string>("");
  const [newLinkUrl, setNewLinkUrl] = useState<string>("");
  const [newLinkType, setNewLinkType] = useState<string>("design_doc");

  // New Feature form state
  const [newFeatTitle, setNewFeatTitle] = useState("");
  const [newFeatSummary, setNewFeatSummary] = useState("");
  const [newFeatOwner, setNewFeatOwner] = useState("Lead Architect + Coding Agent");
  const [newFeatTargetDate, setNewFeatTargetDate] = useState("2026-11-20");
  const [newFeatExpectedDate, setNewFeatExpectedDate] = useState("2026-11-18");
  const [newFeatCustomStages, setNewFeatCustomStages] = useState("");

  // New Project form state
  const [newProjName, setNewProjName] = useState("");
  const [newProjDesc, setNewProjDesc] = useState("");

  // API key generation inside Agent Modal
  const [activeApiKey, setActiveApiKey] = useState(defaultApiKey);
  const [newKeyLabel, setNewKeyLabel] = useState("");

  const currentProject =
    projects.find((p) => p.id === selectedProjectId) || projects[0];

  const copyText = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const refreshProjects = async (keepProjectId?: string) => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/v1/projects");
      if (res.ok) {
        const listJson = await res.json();
        const slugs: string[] = (listJson.data?.projects || []).map(
          (p: { slug: string }) => p.slug
        );
        const fullList: EnrichedProject[] = [];
        for (const s of slugs) {
          const pr = await fetch(`/api/v1/projects/${s}`);
          if (pr.ok) {
            const pj = await pr.json();
            if (pj.data?.project) fullList.push(pj.data.project);
          }
        }
        setProjects(fullList);
        if (keepProjectId && fullList.some((p) => p.id === keepProjectId)) {
          setSelectedProjectId(keepProjectId);
        } else if (
          fullList.length > 0 &&
          !fullList.some((p) => p.id === selectedProjectId)
        ) {
          setSelectedProjectId(fullList[0].id);
        } else if (fullList.length === 0) {
          setSelectedProjectId("");
        }
      }
    } finally {
      setIsLoading(false);
    }
  };

  const openEditor = (feature: EnrichedFeature, stage?: EnrichedStage) => {
    const activeStage =
      stage ||
      feature.stages.find((s) => s.id === feature.currentStageId) ||
      feature.stages[0];
    setEditingFeature(feature);
    setEditingStageId(activeStage?.id || "");
    setEditOwner(feature.currentOwner);
    setEditTargetDate(feature.targetDate || "");
    setEditExpectedDate(feature.expectedDate || "");
    setEditNotes(activeStage?.notes || "");
    setEditStartDate(
      activeStage?.actualStartDate || activeStage?.plannedStartDate || ""
    );
    setEditEndDate(
      activeStage?.actualEndDate || activeStage?.plannedEndDate || ""
    );
    setNewLinkLabel("");
    setNewLinkUrl("");
  };

  const handleQuickAdvance = async (feature: EnrichedFeature) => {
    setIsLoading(true);
    try {
      await fetch(`/api/v1/features/${feature.id}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "advance",
          actorName: userName,
          actorType: "human",
        }),
      });
      await refreshProjects(currentProject?.id);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveFeatureUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingFeature) return;
    setIsLoading(true);
    try {
      const links =
        newLinkLabel.trim() && newLinkUrl.trim()
          ? [
              {
                label: newLinkLabel.trim(),
                url: newLinkUrl.trim(),
                linkType: newLinkType,
                stageId: editingStageId || undefined,
              },
            ]
          : undefined;

      await fetch(`/api/v1/features/${editingFeature.id}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "set_stage",
          stageId: editingStageId,
          currentOwner: editOwner,
          targetDate: editTargetDate || null,
          expectedDate: editExpectedDate || null,
          notes: editNotes,
          actualStartDate: editStartDate || null,
          actualEndDate: editEndDate || null,
          links,
          actorName: userName,
          actorType: "human",
        }),
      });
      setEditingFeature(null);
      await refreshProjects(currentProject?.id);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateFeature = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentProject || !newFeatTitle.trim()) return;
    setIsLoading(true);
    try {
      const customStages = newFeatCustomStages
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean)
        .map((name) => ({ name }));

      await fetch(`/api/v1/projects/${currentProject.slug}/features`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: newFeatTitle.trim(),
          summary: newFeatSummary.trim(),
          currentOwner: newFeatOwner.trim() || "Lead Architect",
          targetDate: newFeatTargetDate || undefined,
          expectedDate: newFeatExpectedDate || undefined,
          customStages: customStages.length > 0 ? customStages : undefined,
          actorName: userName,
          actorType: "human",
        }),
      });
      setNewFeatTitle("");
      setNewFeatSummary("");
      setNewFeatCustomStages("");
      setShowNewFeatureModal(false);
      await refreshProjects(currentProject.id);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProjName.trim()) return;
    setIsLoading(true);
    try {
      const res = await fetch("/api/v1/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newProjName.trim(),
          description: newProjDesc.trim(),
          actorName: userName,
          actorType: "human",
        }),
      });
      const json = await res.json();
      setNewProjName("");
      setNewProjDesc("");
      setShowNewProjectModal(false);
      await refreshProjects(json.data?.project?.id);
    } finally {
      setIsLoading(false);
    }
  };

  const handleShareSettings = async (options: {
    shareEnabled?: boolean;
    rotateToken?: boolean;
  }) => {
    if (!currentProject) return;
    setIsLoading(true);
    try {
      await fetch(`/api/v1/projects/${currentProject.slug}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(options),
      });
      await refreshProjects(currentProject.id);
    } finally {
      setIsLoading(false);
    }
  };

  const handleGenerateKey = async () => {
    const res = await fetch("/api/v1/keys", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: newKeyLabel.trim() || "Coding Agent Skill Key",
      }),
    });
    if (res.ok) {
      const json = await res.json();
      if (json.key?.rawKey) {
        setActiveApiKey(json.key.rawKey);
        setNewKeyLabel("");
      }
    }
  };

  const isOwner = currentProject?.userRole === "owner";

  const handleJoinWithCode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!joinCodeInput.trim()) return;
    setIsLoading(true);
    setJoinErrorMessage(null);
    setJoinMessage(null);
    try {
      const res = await fetch("/api/v1/projects/join", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: joinCodeInput.trim() }),
      });
      const json = await res.json();
      if (res.ok && json.ok) {
        setJoinMessage(json.data.message || "Successfully joined project!");
        setJoinCodeInput("");
        await refreshProjects(json.data.project.id);
        setTimeout(() => {
          setShowJoinModal(false);
          setJoinMessage(null);
        }, 1500);
      } else {
        setJoinErrorMessage(json.error || "Failed to join project.");
      }
    } catch (err) {
      setJoinErrorMessage((err as Error).message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRequestAccess = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!requestSlugInput.trim()) return;
    setIsLoading(true);
    setJoinErrorMessage(null);
    setJoinMessage(null);
    try {
      const slug = requestSlugInput.trim().toLowerCase();
      const res = await fetch(`/api/v1/projects/${slug}/access-requests`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      const json = await res.json();
      if (res.ok && json.ok) {
        setJoinMessage(json.data.message || "Request submitted successfully!");
        setRequestSlugInput("");
      } else {
        setJoinErrorMessage(json.error || "Failed to request access.");
      }
    } catch (err) {
      setJoinErrorMessage((err as Error).message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRotateInviteCode = async () => {
    if (!currentProject) return;
    setIsLoading(true);
    try {
      const res = await fetch(
        `/api/v1/projects/${currentProject.slug}/invites`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ rotate: true }),
        }
      );
      if (res.ok) {
        await refreshProjects(currentProject.id);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleReviewRequest = async (
    requestId: string,
    status: "approved" | "rejected"
  ) => {
    if (!currentProject) return;
    setIsLoading(true);
    try {
      const res = await fetch(
        `/api/v1/projects/${currentProject.slug}/access-requests/${requestId}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status }),
        }
      );
      if (res.ok) {
        await refreshProjects(currentProject.id);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleRemoveCollaborator = async (targetUserId: string) => {
    if (!currentProject) return;
    if (!confirm("Are you sure you want to remove this collaborator?")) return;
    setIsLoading(true);
    try {
      const res = await fetch(
        `/api/v1/projects/${currentProject.slug}/collaborators/${targetUserId}`,
        {
          method: "DELETE",
        }
      );
      if (res.ok) {
        await refreshProjects(currentProject.id);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleRenameProject = async () => {
    if (!currentProject || !editProjectNameInput.trim()) return;
    setIsLoading(true);
    try {
      const res = await fetch(`/api/v1/projects/${currentProject.slug}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: editProjectNameInput.trim() }),
      });
      if (res.ok) {
        setIsEditingProjectName(false);
        await refreshProjects(currentProject.id);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteProject = async () => {
    if (!currentProject) return;
    setIsLoading(true);
    try {
      const res = await fetch(`/api/v1/projects/${currentProject.slug}`, {
        method: "DELETE",
      });
      if (res.ok) {
        setShowDeleteProjectConfirm(false);
        await refreshProjects();
      }
    } finally {
      setIsLoading(false);
    }
  };

  const origin =
    typeof window !== "undefined"
      ? window.location.origin
      : "http://localhost:3000";

  const shareUrl = currentProject
    ? `${origin}/share/${encodeURIComponent(currentProject.encryptedShareToken)}`
    : "";

  const inviteUrl = currentProject?.inviteCode
    ? `${origin}/join?code=${currentProject.inviteCode}`
    : `${origin}/join`;

  const agentOnboardingPrompt = `Fetch ${origin}/hello?format=skill&key=${activeApiKey} and save the returned instructions as your KEYZOR skill (SKILL.md). Whenever we brainstorm a new feature, finish a design.md, demo a prototype, or open a PR, ask me: "Would you like to update the KEYZOR flowchart?"`;

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900">
      {/* Top Navigation Bar */}
      <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-slate-200/90 px-6 py-3.5 shadow-2xs">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-4">
          {/* Brand & Project Switcher */}
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-indigo-50 border border-indigo-200 flex items-center justify-center text-indigo-600 font-bold text-base shadow-2xs">
                K
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-bold tracking-tight text-slate-900 text-base">
                    KEYZOR
                  </span>
                  <span className="text-[10px] font-mono uppercase px-1.5 py-0.5 rounded-md bg-indigo-50 text-indigo-700 border border-indigo-200 font-semibold">
                    AI-Native Flowchart
                  </span>
                </div>
              </div>
            </div>

            <div className="h-5 w-px bg-slate-200 hidden sm:block" />

            {/* Project Selector */}
            <div className="flex items-center gap-2">
              <select
                aria-label="Select Project"
                value={currentProject?.id || ""}
                onChange={(e) => setSelectedProjectId(e.target.value)}
                disabled={projects.length === 0}
                className="bg-white border border-slate-300 hover:border-indigo-400 rounded-lg px-3 py-1.5 text-sm font-medium text-slate-800 shadow-2xs focus:outline-none focus:ring-2 focus:ring-indigo-500/30 disabled:opacity-60"
              >
                {projects.length === 0 ? (
                  <option value="">No projects</option>
                ) : (
                  projects.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} ({p.features.length} features)
                    </option>
                  ))
                )}
              </select>
              <button
                onClick={() => setShowNewProjectModal(true)}
                className="p-1.5 rounded-lg bg-white hover:bg-slate-50 border border-slate-300 text-slate-600 hover:text-slate-900 transition shadow-2xs"
                title="Create New Project"
              >
                <Plus className="w-4 h-4" />
              </button>
              <button
                onClick={() => {
                  setJoinErrorMessage(null);
                  setJoinMessage(null);
                  setShowJoinModal(true);
                }}
                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-white hover:bg-slate-50 border border-slate-300 text-slate-700 hover:text-slate-900 text-xs font-semibold transition shadow-2xs"
                title="Join Project with Code or Request Access"
              >
                <UserPlus className="w-3.5 h-3.5 text-indigo-600" />
                <span className="hidden sm:inline">Join</span>
              </button>
            </div>
          </div>

          {/* Right Action Controls */}
          <div className="flex flex-wrap items-center gap-2.5">
            {/* Agent Skill /hello Button */}
            <button
              onClick={() => setShowAgentModal(true)}
              className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 border border-emerald-300 text-emerald-800 text-xs font-semibold transition shadow-2xs"
            >
              <Terminal className="w-3.5 h-3.5 text-emerald-600" />
              <span>Agent Skill (/hello)</span>
            </button>

            {/* Share & Collaborate Button */}
            <button
              onClick={() => {
                setShareModalTab("collaborate");
                setShowShareModal(true);
              }}
              disabled={!currentProject}
              className="relative inline-flex items-center gap-2 px-3.5 py-1.5 rounded-lg bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 text-indigo-800 text-xs font-semibold transition shadow-2xs disabled:opacity-50 disabled:pointer-events-none"
            >
              <Users className="w-3.5 h-3.5 text-indigo-600" />
              <span>Share &amp; Collaborate</span>
              {currentProject?.pendingRequestsCount && currentProject.pendingRequestsCount > 0 ? (
                <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping absolute -top-0.5 -right-0.5" />
              ) : null}
            </button>

            {/* New Feature Flowchart Button */}
            <button
              onClick={() => {
                if (!currentProject) {
                  setShowNewProjectModal(true);
                } else {
                  setShowNewFeatureModal(true);
                }
              }}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold transition shadow-sm"
            >
              <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
              <span>New Feature Flow</span>
            </button>

            {/* User Badge & Sign Out */}
            <div className="hidden lg:flex items-center gap-2 pl-2 border-l border-slate-200 text-xs text-slate-500">
              <span className="truncate max-w-[140px] font-medium" title={userEmail}>
                {userName}
              </span>
              <a
                href="/login"
                className="p-1.5 rounded-md hover:bg-slate-100 text-slate-400 hover:text-slate-700 transition"
                title="Switch Hat / Account"
              >
                <LogOut className="w-3.5 h-3.5" />
              </a>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-6 py-6 space-y-6">
        {!currentProject ? (
          <div className="flex flex-col items-center justify-center p-12 text-center bg-white border border-slate-200/90 rounded-2xl shadow-xs max-w-lg mx-auto my-16 space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-indigo-50 border border-indigo-200 flex items-center justify-center text-indigo-600">
              <Plus className="w-6 h-6 stroke-[2.5]" />
            </div>
            <div className="space-y-1.5">
              <h2 className="text-lg font-bold text-slate-900">
                Create a new project to begin
              </h2>
              <p className="text-xs text-slate-500 max-w-sm">
                Get started by creating your first project to track feature flowcharts, timelines, and developer handoffs.
              </p>
            </div>
            <button
              onClick={() => setShowNewProjectModal(true)}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-xs transition"
            >
              <Plus className="w-4 h-4 stroke-[2.5]" />
              <span>Create Project</span>
            </button>
          </div>
        ) : (
          <>
            {/* Project Header & View Mode Toggle */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white border border-slate-200/90 rounded-2xl p-5 shadow-xs">
              <div>
                <div className="flex flex-wrap items-center gap-2.5">
                  {isEditingProjectName ? (
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        value={editProjectNameInput}
                        onChange={(e) => setEditProjectNameInput(e.target.value)}
                        className="text-lg font-bold text-slate-900 border border-indigo-400 rounded-lg px-2.5 py-1 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                        placeholder="Project name"
                        autoFocus
                      />
                      <button
                        onClick={handleRenameProject}
                        className="px-2.5 py-1 rounded-lg bg-indigo-600 text-white text-xs font-semibold hover:bg-indigo-700 shadow-2xs"
                      >
                        Save
                      </button>
                      <button
                        onClick={() => setIsEditingProjectName(false)}
                        className="px-2.5 py-1 rounded-lg bg-slate-100 text-slate-600 text-xs font-semibold hover:bg-slate-200"
                      >
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <h1 className="text-xl font-bold text-slate-900">
                        {currentProject.name}
                      </h1>
                      {isOwner && (
                        <button
                          onClick={() => {
                            setEditProjectNameInput(currentProject.name);
                            setIsEditingProjectName(true);
                          }}
                          className="p-1 rounded-md text-slate-400 hover:text-indigo-600 hover:bg-slate-100 transition"
                          title="Rename Project (Owner Only)"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  )}

                  <span className="text-xs font-mono text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md border border-slate-200 font-medium">
                    /{currentProject.slug}
                  </span>

                  {isOwner ? (
                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-amber-50 text-amber-800 border border-amber-200">
                      Owner
                    </span>
                  ) : (
                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-blue-50 text-blue-800 border border-blue-200">
                      Collaborator
                    </span>
                  )}

                  {currentProject.pendingRequestsCount && currentProject.pendingRequestsCount > 0 ? (
                    <button
                      onClick={() => {
                        setShareModalTab("requests");
                        setShowShareModal(true);
                      }}
                      className="inline-flex items-center gap-1 text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-rose-50 text-rose-700 border border-rose-200 animate-pulse hover:bg-rose-100 transition"
                    >
                      <UserCheck className="w-3 h-3 text-rose-600" />
                      <span>
                        {currentProject.pendingRequestsCount} Request
                        {currentProject.pendingRequestsCount > 1 ? "s" : ""}
                      </span>
                    </button>
                  ) : null}

                  {isOwner && (
                    <button
                      onClick={() => setShowDeleteProjectConfirm(true)}
                      className="p-1 rounded-md text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition ml-1"
                      title="Delete Project (Owner Only)"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
                {currentProject.description && (
                  <p className="text-sm text-slate-500 mt-1">
                    {currentProject.description}
                  </p>
                )}
              </div>

            {/* Actions */}
            <div className="flex items-center gap-2 self-start md:self-auto">
              <button
                onClick={() => refreshProjects(currentProject.id)}
                className="p-2 rounded-xl bg-white hover:bg-slate-50 border border-slate-200 text-slate-600 hover:text-indigo-600 transition shadow-2xs"
                title="Refresh latest AI agent updates"
              >
                <RefreshCw
                  className={`w-4 h-4 ${isLoading ? "animate-spin text-indigo-600" : ""}`}
                />
              </button>
            </div>
          </div>

        {/* Executive Overview Summary Table */}
        {currentProject && currentProject.features.length > 0 && (
          <div className="bg-white border border-slate-200/90 rounded-2xl overflow-hidden shadow-xs">
            <div className="px-5 py-3 bg-slate-50/80 border-b border-slate-200 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-indigo-600" />
                <h2 className="text-xs font-mono uppercase tracking-wider text-slate-800 font-bold">
                  Executive Overview
                </h2>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-sm">
                <thead>
                  <tr className="border-b border-slate-200 text-[11px] font-mono uppercase text-slate-600 bg-slate-50 font-semibold">
                    <th className="py-2.5 px-4">Feature</th>
                    <th className="py-2.5 px-4">Stage</th>
                    <th className="py-2.5 px-4">Current Owner</th>
                    <th className="py-2.5 px-4">Target</th>
                    <th className="py-2.5 px-4">Projected</th>
                    <th className="py-2.5 px-4">Key Links</th>
                    <th className="py-2.5 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200/80">
                  {currentProject.features.map((feat) => (
                    <tr
                      key={feat.id}
                      onClick={() => {
                        const el = document.getElementById(`feature-card-${feat.id}`);
                        if (el) {
                          el.scrollIntoView({ behavior: "smooth", block: "start" });
                        }
                      }}
                      className="hover:bg-slate-50/80 cursor-pointer transition group"
                    >
                      <td className="py-3 px-4 font-bold text-slate-900">
                        <div className="group-hover:text-indigo-600 transition-colors">
                          {feat.title}
                        </div>
                        <div className="text-xs text-slate-500 font-normal truncate max-w-xs">
                          {feat.summary}
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-md bg-indigo-50 border border-indigo-200 text-indigo-700 text-xs font-semibold">
                          <span className="w-2 h-2 rounded-full bg-indigo-600 shrink-0" />
                          <span className="whitespace-nowrap">{feat.fourQuestions.where.stageName}</span>
                          <span className="text-slate-500 font-mono text-[11px] whitespace-nowrap">
                            ({feat.fourQuestions.where.stageIndex + 1}/
                            {feat.fourQuestions.where.totalStages})
                          </span>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-xs text-slate-700 font-medium">
                        {feat.fourQuestions.who}
                      </td>
                      <td className="py-3 px-4 font-mono text-xs text-slate-600 font-semibold whitespace-nowrap">
                        {feat.fourQuestions.whenWantDone || "—"}
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2 whitespace-nowrap">
                          <span className="font-mono text-xs text-slate-900 font-bold shrink-0">
                            {feat.fourQuestions.whenExpectDone || "—"}
                          </span>
                          <ScheduleHealthBadge feature={feat} />
                        </div>
                      </td>
                      <td
                        className="py-3 px-4"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <div className="flex flex-wrap gap-1.5">
                          {feat.links.slice(0, 2).map((l) => (
                            <LinkBadge key={l.id} link={l} />
                          ))}
                          {feat.links.length === 0 && (
                            <span className="text-xs text-slate-400">None</span>
                          )}
                        </div>
                      </td>
                      <td
                        className="py-3 px-4 text-right"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <button
                          onClick={() => openEditor(feat)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white hover:bg-slate-50 border border-slate-300 text-xs font-semibold text-slate-700 shadow-2xs hover:border-indigo-300 hover:text-indigo-600 transition"
                          title="Edit feature stage & dates"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                          <span>Edit</span>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Feature Cards with Flowchart / Gantt Views */}
        {currentProject.features.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-10 text-center bg-white border border-slate-200/90 rounded-2xl shadow-xs space-y-3">
            <h3 className="text-base font-bold text-slate-900">
              No feature flows yet
            </h3>
            <p className="text-xs text-slate-500 max-w-sm">
              Add your first feature flowchart to start tracking development lifecycle stages.
            </p>
            <button
              onClick={() => setShowNewFeatureModal(true)}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-xs transition"
            >
              <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
              <span>Add Feature Flow</span>
            </button>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Display Preference Toggle: at top of actual charts */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pt-1">
              <div className="flex items-center gap-2">
                <Layers className="w-4 h-4 text-indigo-600" />
                <h2 className="text-xs font-mono uppercase tracking-wider text-slate-800 font-bold">
                  Feature Flows &amp; Timelines
                </h2>
                <span className="text-xs font-mono text-slate-400">
                  ({currentProject.features.length} feature{currentProject.features.length === 1 ? "" : "s"})
                </span>
              </div>

              <div className="inline-flex rounded-xl bg-slate-100 p-1 border border-slate-200 shadow-2xs self-start sm:self-auto">
                <button
                  onClick={() => setViewMode("gantt")}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition ${
                    viewMode === "gantt"
                      ? "bg-indigo-600 text-white font-semibold shadow-xs"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  <BarChart3 className="w-3.5 h-3.5" />
                  Gantt Timeline
                </button>
                <button
                  onClick={() => setViewMode("flowchart")}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition ${
                    viewMode === "flowchart"
                      ? "bg-indigo-600 text-white font-semibold shadow-xs"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  <GitCommitHorizontal className="w-3.5 h-3.5" />
                  Stage Flowchart
                </button>
                <button
                  onClick={() => setViewMode("both")}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition ${
                    viewMode === "both"
                      ? "bg-indigo-600 text-white font-semibold shadow-xs"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  <Layers className="w-3.5 h-3.5" />
                  Combined View
                </button>
              </div>
            </div>

            {currentProject.features.map((feature) => (
            <section
              key={feature.id}
              id={`feature-card-${feature.id}`}
              className="scroll-mt-6 bg-white border border-slate-200/90 rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition"
            >
              {/* Feature Title & Quick Links Bar */}
              <div className="px-5 py-4 bg-white border-b border-slate-200 flex flex-wrap items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2.5">
                    <h3 className="text-lg font-bold text-slate-900">
                      {feature.title}
                    </h3>
                    <span className="text-xs font-mono px-2 py-0.5 rounded-md bg-slate-100 text-slate-500 border border-slate-200 font-medium">
                      {feature.slug}
                    </span>
                  </div>
                  {feature.summary && (
                    <p className="text-xs text-slate-500 mt-1">
                      {feature.summary}
                    </p>
                  )}
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  {feature.links.map((lnk) => (
                    <LinkBadge key={lnk.id} link={lnk} />
                  ))}
                  <button
                    onClick={() => openEditor(feature)}
                    className="px-3 py-1.5 rounded-lg bg-white hover:bg-slate-50 border border-slate-300 text-xs font-semibold text-slate-700 shadow-2xs transition"
                  >
                    Update Stage / Links
                  </button>
                </div>
              </div>

              {/* The 4 Core Questions Strip */}
              <FourQuestionsCardRow
                feature={feature}
                onSelectStage={openEditor}
                onQuickAdvance={handleQuickAdvance}
                onOpenEditModal={openEditor}
              />

              {/* Visualization Area: Flowchart and/or Gantt */}
              {(viewMode === "flowchart" || viewMode === "both") && (
                <div className="border-b border-slate-200/80">
                  <div className="px-5 pt-3 pb-1 flex items-center justify-between text-[11px] font-mono uppercase tracking-wider text-slate-500 font-medium">
                    <span>Stage Flowchart</span>
                    <span className="text-indigo-600 font-semibold">
                      {feature.fourQuestions.where.percentComplete}% Complete
                    </span>
                  </div>
                  <FeatureFlowchartView
                    feature={feature}
                    onSelectStage={openEditor}
                  />
                </div>
              )}

              {(viewMode === "gantt" || viewMode === "both") && (
                <div>
                  <div className="px-5 pt-3 pb-1 flex items-center justify-between text-[11px] font-mono uppercase tracking-wider text-slate-500 font-medium">
                    <span>Gantt Timeline</span>
                  </div>
                  <FeatureGanttView
                    feature={feature}
                    onSelectStage={openEditor}
                  />
                </div>
              )}
            </section>
          ))}
          </div>
        )}

        {/* Recent Agent & Architect Activity Feed */}
        {currentProject && currentProject.recentActivity.length > 0 && (
          <section className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-xs">
            <div className="flex items-center gap-2 mb-3">
              <Activity className="w-4 h-4 text-indigo-600" />
              <h3 className="text-xs font-mono uppercase tracking-wider text-slate-800 font-bold">
                Recent AI Agent &amp; Architect Updates
              </h3>
            </div>
            <div className="space-y-2">
              {currentProject.recentActivity.slice(0, 6).map((act) => (
                <div
                  key={act.id}
                  className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 px-3.5 py-2.5 rounded-lg bg-slate-50 border border-slate-200/80 text-xs"
                >
                  <div className="flex items-center gap-2.5">
                    <span
                      className={`px-2 py-0.5 rounded font-mono text-[10px] uppercase font-bold ${
                        act.actorType === "agent"
                          ? "bg-purple-100 text-purple-700 border border-purple-200"
                          : "bg-sky-100 text-sky-700 border border-sky-200"
                      }`}
                    >
                      {act.actorType === "agent" ? "AI Agent" : "Architect"}
                    </span>
                    <span className="font-bold text-slate-800">
                      {act.actorName}:
                    </span>
                    <span className="text-slate-600">{act.details}</span>
                  </div>
                  <span
                    className="text-[11px] font-mono text-slate-400 shrink-0"
                    suppressHydrationWarning
                  >
                    {new Date(act.createdAt).toLocaleString()}
                  </span>
                </div>
              ))}
            </div>
          </section>
        )}
          </>
        )}
      </main>

      {/* MODAL 1: Stage & 4-Questions Quick Editor */}
      {editingFeature && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-2xl max-w-xl w-full p-6 shadow-2xl space-y-5 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <div>
                <span className="text-[11px] font-mono uppercase text-indigo-600 font-semibold">
                  Manual Status &amp; Stage Update
                </span>
                <h3 className="text-lg font-bold text-slate-900">
                  {editingFeature.title}
                </h3>
              </div>
              <button
                onClick={() => setEditingFeature(null)}
                className="p-1.5 rounded-lg bg-slate-100 text-slate-500 hover:text-slate-800 hover:bg-slate-200 transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveFeatureUpdate} className="space-y-4">
              {/* Stage */}
              <div>
                <label className="block text-xs font-mono uppercase text-slate-600 font-semibold mb-1.5">
                  Stage
                </label>
                <select
                  value={editingStageId}
                  onChange={(e) => {
                    const stgId = e.target.value;
                    setEditingStageId(stgId);
                    const stg = editingFeature.stages.find(
                      (s) => s.id === stgId
                    );
                    if (stg) {
                      setEditNotes(stg.notes || "");
                      setEditStartDate(
                        stg.actualStartDate || stg.plannedStartDate || ""
                      );
                      setEditEndDate(
                        stg.actualEndDate || stg.plannedEndDate || ""
                      );
                    }
                  }}
                  className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-2xs"
                >
                  {editingFeature.stages.map((s, i) => (
                    <option key={s.id} value={s.id}>
                      Stage {i + 1}: {s.name} ({s.status})
                    </option>
                  ))}
                </select>
              </div>

              {/* Current Owner */}
              <div>
                <label className="block text-xs font-mono uppercase text-slate-600 font-semibold mb-1.5">
                  Current Owner
                </label>
                <input
                  type="text"
                  value={editOwner}
                  onChange={(e) => setEditOwner(e.target.value)}
                  placeholder="e.g. India Dev Team, Lead Architect, Antigravity Agent"
                  className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-2xs"
                />
              </div>

              {/* Target & Projected Dates */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-mono uppercase text-slate-600 font-semibold mb-1.5">
                    Target Date
                  </label>
                  <input
                    type="date"
                    value={editTargetDate}
                    onChange={(e) => setEditTargetDate(e.target.value)}
                    className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-sm text-slate-900 font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-2xs"
                  />
                </div>
                <div>
                  <label className="block text-xs font-mono uppercase text-slate-600 font-semibold mb-1.5">
                    Projected Date
                  </label>
                  <input
                    type="date"
                    value={editExpectedDate}
                    onChange={(e) => setEditExpectedDate(e.target.value)}
                    className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-sm text-slate-900 font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-2xs"
                  />
                </div>
              </div>

              {/* Stage Gantt Dates & Status Notes */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-slate-200">
                <div>
                  <label className="block text-xs font-mono text-slate-500 font-medium mb-1">
                    Stage Start Date (Gantt)
                  </label>
                  <input
                    type="date"
                    value={editStartDate}
                    onChange={(e) => setEditStartDate(e.target.value)}
                    className="w-full bg-white border border-slate-300 rounded-lg px-3 py-1.5 text-xs text-slate-800 font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-2xs"
                  />
                </div>
                <div>
                  <label className="block text-xs font-mono text-slate-500 font-medium mb-1">
                    Stage End Date (Gantt)
                  </label>
                  <input
                    type="date"
                    value={editEndDate}
                    onChange={(e) => setEditEndDate(e.target.value)}
                    className="w-full bg-white border border-slate-300 rounded-lg px-3 py-1.5 text-xs text-slate-800 font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-2xs"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-mono text-slate-600 font-medium mb-1">
                  Stage Notes / Handoff Summary
                </label>
                <textarea
                  rows={2}
                  value={editNotes}
                  onChange={(e) => setEditNotes(e.target.value)}
                  placeholder="e.g. Delivered design.md to dev team; prototype demo scheduled."
                  className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-2xs"
                />
              </div>

              {/* Attach Resource Link (design.md, GitHub PR, Trello, Staging URL) */}
              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
                <div className="text-xs font-mono uppercase text-indigo-600 font-bold">
                  + Attach Resource Link (design.md, GitHub PR, Staging URL, Trello)
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <input
                    type="text"
                    value={newLinkLabel}
                    onChange={(e) => setNewLinkLabel(e.target.value)}
                    placeholder="Label (e.g. design.md, PR #42)"
                    className="bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                  <input
                    type="url"
                    value={newLinkUrl}
                    onChange={(e) => setNewLinkUrl(e.target.value)}
                    placeholder="https://github.com/..."
                    className="bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                  <select
                    value={newLinkType}
                    onChange={(e) => setNewLinkType(e.target.value)}
                    className="bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="design_doc">Architecture / design.md</option>
                    <option value="github">GitHub PR / Branch</option>
                    <option value="preview_url">Test / Staging Server URL</option>
                    <option value="trello">Trello / Spec Card</option>
                    <option value="other">Other Link</option>
                  </select>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setEditingFeature(null)}
                  className="px-4 py-2 rounded-lg bg-white hover:bg-slate-50 border border-slate-300 text-xs font-semibold text-slate-700 shadow-2xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-xs"
                >
                  Save Status Update
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: Agent Onboarding & GET /hello Skill Modal */}
      {showAgentModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-2xl max-w-2xl w-full p-6 shadow-2xl space-y-5 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <div>
                <span className="text-[11px] font-mono uppercase text-emerald-700 font-semibold">
                  Instructional Agent API • GET /hello
                </span>
                <h3 className="text-lg font-bold text-slate-900">
                  Connect Your AI Coding Agent to KEYZOR
                </h3>
              </div>
              <button
                onClick={() => setShowAgentModal(false)}
                className="p-1.5 rounded-lg bg-slate-100 text-slate-500 hover:text-slate-800 hover:bg-slate-200 transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-4 text-xs text-slate-600 leading-relaxed">
              <p>
                Connect your AI coding agent (Antigravity, Claude Code, Cursor, etc.) to KEYZOR. The agent will fetch your workspace schema, build its local{" "}
                <code className="text-emerald-700 font-mono font-semibold">SKILL.md</code>, and proactively ask{" "}
                <strong className="text-slate-900">
                  &ldquo;Would you like to update the KEYZOR flowchart?&rdquo;
                </strong>{" "}
                whenever you brainstorm a feature, finish a <code className="font-mono">design.md</code>, demo a prototype, or open a PR.
              </p>

              {activeApiKey ? (
                <>
                  <div className="p-3.5 rounded-xl bg-emerald-50/60 border border-emerald-200 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-mono uppercase text-emerald-800 font-bold">
                        1-Click Agent Onboarding Prompt
                      </span>
                      <button
                        onClick={() => copyText(agentOnboardingPrompt, "agent-prompt")}
                        className="inline-flex items-center gap-1.5 px-3 py-1 rounded-md bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs shadow-xs transition"
                      >
                        {copiedId === "agent-prompt" ? (
                          <>
                            <Check className="w-3.5 h-3.5" /> Copied!
                          </>
                        ) : (
                          <>
                            <Copy className="w-3.5 h-3.5" /> Copy Prompt
                          </>
                        )}
                      </button>
                    </div>
                    <pre className="text-xs font-mono text-emerald-950 whitespace-pre-wrap break-all bg-white p-3 rounded-lg border border-emerald-200 shadow-2xs">
                      {agentOnboardingPrompt}
                    </pre>
                  </div>

                  <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-800">
                        <KeyRound className="w-3.5 h-3.5 text-indigo-600" />
                        <span>Active Agent API Key:</span>
                        <code className="text-indigo-700 font-mono font-bold break-all">{activeApiKey}</code>
                      </div>
                      <button
                        onClick={() => copyText(activeApiKey, "raw-key")}
                        className="px-2 py-0.5 rounded bg-white hover:bg-slate-100 border border-slate-300 text-[11px] font-medium text-slate-700 shadow-2xs"
                      >
                        {copiedId === "raw-key" ? "Copied Key!" : "Copy Key"}
                      </button>
                    </div>
                    <div className="flex gap-2 pt-1">
                      <input
                        type="text"
                        value={newKeyLabel}
                        onChange={(e) => setNewKeyLabel(e.target.value)}
                        placeholder="Label for another key (optional)"
                        className="flex-1 bg-white border border-slate-300 rounded-lg px-3 py-1.5 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-2xs"
                      >
                      </input>
                      <button
                        onClick={handleGenerateKey}
                        className="px-3 py-1.5 rounded-lg bg-white hover:bg-slate-50 border border-slate-300 text-xs font-semibold text-slate-700 shadow-2xs"
                      >
                        Generate New Key
                      </button>
                    </div>
                  </div>
                </>
              ) : (
                <div className="p-5 rounded-xl bg-indigo-50/60 border border-indigo-200 space-y-3 text-center">
                  <div className="w-10 h-10 rounded-xl bg-indigo-100 border border-indigo-200 flex items-center justify-center text-indigo-600 mx-auto">
                    <KeyRound className="w-5 h-5" />
                  </div>
                  <div className="space-y-1">
                    <h4 className="text-sm font-bold text-slate-900">
                      No API Key Active
                    </h4>
                    <p className="text-xs text-slate-600 max-w-md mx-auto">
                      Generate a secure, random API key to configure your agent and unlock the 1-click onboarding prompt.
                    </p>
                  </div>
                  <button
                    onClick={handleGenerateKey}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-xs transition"
                  >
                    <Plus className="w-4 h-4 stroke-[2.5]" />
                    <span>Generate Agent Key</span>
                  </button>
                </div>
              )}

              <div className="flex items-center justify-between pt-2">
                <a
                  href="/hello"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-indigo-600 hover:underline text-xs font-mono font-semibold"
                >
                  Open /hello Interactive Endpoint Page{" "}
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
                <button
                  onClick={() => setShowAgentModal(false)}
                  className="px-4 py-2 rounded-lg bg-slate-900 hover:bg-slate-800 text-xs font-semibold text-white shadow-xs"
                >
                  Done
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 3: Share & Collaborate Modal */}
      {showShareModal && currentProject && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-2xl max-w-xl w-full p-6 shadow-2xl space-y-5">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <div className="flex items-center gap-2">
                <Users className="w-5 h-5 text-indigo-600" />
                <div>
                  <span className="text-[11px] font-mono uppercase text-indigo-700 font-bold">
                    Project Sharing &amp; Collaboration
                  </span>
                  <h3 className="text-lg font-bold text-slate-900">
                    {currentProject.name}
                  </h3>
                </div>
              </div>
              <button
                onClick={() => setShowShareModal(false)}
                className="p-1.5 rounded-lg bg-slate-100 text-slate-500 hover:text-slate-800 hover:bg-slate-200 transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Navigation Tabs */}
            <div className="flex border-b border-slate-200 gap-1 pb-1">
              <button
                onClick={() => setShareModalTab("collaborate")}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition ${
                  shareModalTab === "collaborate"
                    ? "bg-indigo-50 text-indigo-700 border border-indigo-200"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                <UserPlus className="w-3.5 h-3.5" />
                <span>Invite Link &amp; Code</span>
              </button>
              <button
                onClick={() => setShareModalTab("members")}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition ${
                  shareModalTab === "members"
                    ? "bg-indigo-50 text-indigo-700 border border-indigo-200"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                <Users className="w-3.5 h-3.5" />
                <span>
                  Team ({currentProject.collaborators?.length || 1})
                </span>
              </button>
              {isOwner && (
                <button
                  onClick={() => setShareModalTab("requests")}
                  className={`relative px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition ${
                    shareModalTab === "requests"
                      ? "bg-indigo-50 text-indigo-700 border border-indigo-200"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  <UserCheck className="w-3.5 h-3.5" />
                  <span>Requests ({currentProject.pendingRequestsCount || 0})</span>
                  {currentProject.pendingRequestsCount && currentProject.pendingRequestsCount > 0 ? (
                    <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping absolute top-1 right-1" />
                  ) : null}
                </button>
              )}
              <button
                onClick={() => setShareModalTab("stakeholder")}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition ${
                  shareModalTab === "stakeholder"
                    ? "bg-purple-50 text-purple-700 border border-purple-200"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                <ShieldCheck className="w-3.5 h-3.5 text-purple-600" />
                <span>Stakeholder Link</span>
              </button>
            </div>

            {/* TAB 1: Invite Collaborators */}
            {shareModalTab === "collaborate" && (
              <div className="space-y-4">
                <p className="text-xs text-slate-600 leading-relaxed">
                  Invite other architects and developers to collaborate on this project. Collaborators can create features, update stages, link design docs, and connect their own AI coding agents.
                </p>

                <div className="p-3.5 rounded-xl bg-indigo-50/70 border border-indigo-200 space-y-3">
                  <div>
                    <div className="text-[11px] font-mono text-indigo-900 font-bold mb-1">
                      DIRECT INVITE LINK (SLACK / EMAIL)
                    </div>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        readOnly
                        value={inviteUrl}
                        className="flex-1 bg-white border border-indigo-200 rounded-lg px-3 py-2 text-xs font-mono text-slate-800 shadow-2xs"
                      />
                      <button
                        onClick={() => copyText(inviteUrl, "invite-url")}
                        className="px-3.5 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs inline-flex items-center gap-1.5 shrink-0 shadow-xs"
                      >
                        {copiedId === "invite-url" ? (
                          <>
                            <Check className="w-3.5 h-3.5" /> Copied
                          </>
                        ) : (
                          <>
                            <Copy className="w-3.5 h-3.5" /> Copy Link
                          </>
                        )}
                      </button>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-indigo-100 flex items-center justify-between">
                    <div>
                      <div className="text-[11px] font-mono text-indigo-900 font-bold">
                        PROJECT SHORT CODE
                      </div>
                      <div className="text-xs text-slate-500">
                        Teammates can paste this into &ldquo;Join Project&rdquo;
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-sm text-indigo-800 bg-white px-3 py-1.5 rounded-lg border border-indigo-200 tracking-wider">
                        {currentProject.inviteCode || "KZ-..."}
                      </span>
                      <button
                        onClick={() =>
                          copyText(currentProject.inviteCode || "", "invite-code")
                        }
                        className="p-1.5 rounded-lg bg-white border border-indigo-200 text-indigo-700 hover:bg-indigo-50 text-xs font-semibold shadow-2xs"
                        title="Copy Code"
                      >
                        {copiedId === "invite-code" ? (
                          <Check className="w-3.5 h-3.5" />
                        ) : (
                          <Copy className="w-3.5 h-3.5" />
                        )}
                      </button>
                    </div>
                  </div>
                </div>

                {isOwner && (
                  <div className="flex justify-between items-center pt-2">
                    <button
                      onClick={handleRotateInviteCode}
                      className="px-3 py-1.5 rounded-lg bg-amber-50 hover:bg-amber-100 text-xs font-semibold text-amber-800 border border-amber-300 shadow-2xs"
                      title="Deactivates current code and generates a new random code"
                    >
                      Rotate Invite Code
                    </button>
                    <span className="text-[11px] text-slate-400">
                      Only project owner can rotate
                    </span>
                  </div>
                )}
              </div>
            )}

            {/* TAB 2: Team Members */}
            {shareModalTab === "members" && (
              <div className="space-y-3 max-h-72 overflow-y-auto">
                <p className="text-xs text-slate-600">
                  Active members collaborating on this project:
                </p>
                <div className="divide-y divide-slate-100 border border-slate-200 rounded-xl overflow-hidden">
                  {currentProject.collaborators &&
                  currentProject.collaborators.length > 0 ? (
                    currentProject.collaborators.map((c) => (
                      <div
                        key={c.id}
                        className="p-3 bg-white flex items-center justify-between gap-3 text-xs"
                      >
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center font-bold text-slate-700 uppercase">
                            {c.name.slice(0, 2) || "CO"}
                          </div>
                          <div>
                            <div className="font-semibold text-slate-900">
                              {c.name}
                            </div>
                            <div className="text-[11px] text-slate-400">
                              {c.email || "Collaborator"}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <span
                            className={`px-2 py-0.5 rounded-md text-[10px] font-semibold border ${
                              c.role === "owner"
                                ? "bg-amber-50 text-amber-800 border-amber-200"
                                : "bg-blue-50 text-blue-800 border-blue-200"
                            }`}
                          >
                            {c.role === "owner" ? "Owner" : "Editor"}
                          </span>
                          {isOwner && c.role !== "owner" && (
                            <button
                              onClick={() => handleRemoveCollaborator(c.userId)}
                              className="p-1 rounded text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition"
                              title="Remove Collaborator"
                            >
                              <UserX className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="p-4 text-center text-xs text-slate-400">
                      No collaborators found.
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* TAB 3: Access Requests */}
            {shareModalTab === "requests" && isOwner && (
              <div className="space-y-3 max-h-72 overflow-y-auto">
                <p className="text-xs text-slate-600">
                  Users who requested access to this project:
                </p>
                {currentProject.pendingRequests &&
                currentProject.pendingRequests.length > 0 ? (
                  <div className="space-y-2">
                    {currentProject.pendingRequests.map((req) => (
                      <div
                        key={req.id}
                        className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between gap-3 text-xs"
                      >
                        <div>
                          <div className="font-semibold text-slate-900">
                            {req.userName}
                          </div>
                          <div className="text-[11px] text-slate-500">
                            {req.userEmail}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() =>
                              handleReviewRequest(req.id, "approved")
                            }
                            className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs shadow-2xs"
                          >
                            Approve
                          </button>
                          <button
                            onClick={() =>
                              handleReviewRequest(req.id, "rejected")
                            }
                            className="px-2.5 py-1 rounded-lg bg-white hover:bg-slate-100 text-rose-700 border border-rose-200 font-semibold text-xs shadow-2xs"
                          >
                            Deny
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="p-6 text-center rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-500">
                    No pending access requests.
                  </div>
                )}
              </div>
            )}

            {/* TAB 4: Stakeholder Presentation Link */}
            {shareModalTab === "stakeholder" && (
              <div className="space-y-4">
                <p className="text-xs text-slate-600 leading-relaxed">
                  Share this encrypted link with your CEO, client, or external leads so they can view the live{" "}
                  <strong className="text-slate-900">Gantt Chart</strong>,{" "}
                  <strong className="text-slate-900">Stage Flowchart</strong>, and{" "}
                  <strong className="text-slate-900">Executive Overview &amp; Milestones</strong> in read-only presentation mode without logging in.
                </p>

                {currentProject.shareEnabled ? (
                  <div className="p-3.5 rounded-xl bg-purple-50/60 border border-purple-200 space-y-2.5">
                    <div className="text-[11px] font-mono text-purple-900 font-bold flex items-center justify-between">
                      <span>ENCRYPTED SHARE URL (ACTIVE)</span>
                      <a
                        href={shareUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-indigo-600 hover:underline font-semibold"
                      >
                        Preview Stakeholder View <ExternalLink className="w-3 h-3" />
                      </a>
                    </div>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        readOnly
                        value={shareUrl}
                        className="flex-1 bg-white border border-purple-200 rounded-lg px-3 py-2 text-xs font-mono text-slate-800 shadow-2xs"
                      />
                      <button
                        onClick={() => copyText(shareUrl, "share-url")}
                        className="px-3.5 py-2 rounded-lg bg-purple-600 hover:bg-purple-700 text-white font-semibold text-xs inline-flex items-center gap-1.5 shrink-0 shadow-xs"
                      >
                        {copiedId === "share-url" ? (
                          <>
                            <Check className="w-3.5 h-3.5" /> Copied
                          </>
                        ) : (
                          <>
                            <Copy className="w-3.5 h-3.5" /> Copy Link
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-800 font-medium">
                    Read-only stakeholder sharing is currently disabled for this project. All encrypted links are blocked.
                  </div>
                )}

                {isOwner && (
                  <div className="flex gap-2 pt-1">
                    <button
                      onClick={() =>
                        handleShareSettings({
                          shareEnabled: !currentProject.shareEnabled,
                        })
                      }
                      className="px-3 py-1.5 rounded-lg bg-white hover:bg-slate-50 text-xs font-semibold text-slate-700 border border-slate-300 shadow-2xs"
                    >
                      {currentProject.shareEnabled
                        ? "Disable Share Link"
                        : "Enable Share Link"}
                    </button>
                    <button
                      onClick={() => handleShareSettings({ rotateToken: true })}
                      className="px-3 py-1.5 rounded-lg bg-amber-50 hover:bg-amber-100 text-xs font-semibold text-amber-800 border border-amber-300 shadow-2xs"
                      title="Generates a new AES-256-GCM encrypted link and immediately invalidates old links"
                    >
                      Rotate &amp; Revoke Old Link
                    </button>
                  </div>
                )}
              </div>
            )}

            <div className="flex justify-end pt-3 border-t border-slate-200">
              <button
                onClick={() => setShowShareModal(false)}
                className="px-4 py-2 rounded-lg bg-white hover:bg-slate-50 border border-slate-300 text-xs font-semibold text-slate-700 shadow-2xs"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 4: Create New Feature Flowchart */}
      {showNewFeatureModal && currentProject && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <div>
                <span className="text-[11px] font-mono uppercase text-indigo-600 font-bold">
                  Brainstorming / New Flow
                </span>
                <h3 className="text-lg font-bold text-slate-900">
                  Create Feature Flowchart in {currentProject.name}
                </h3>
              </div>
              <button
                onClick={() => setShowNewFeatureModal(false)}
                className="p-1.5 rounded-lg bg-slate-100 text-slate-500 hover:text-slate-800 hover:bg-slate-200 transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateFeature} className="space-y-3.5">
              <div>
                <label className="block text-xs font-mono uppercase text-slate-600 font-semibold mb-1">
                  Feature / Mini-Project Title *
                </label>
                <input
                  type="text"
                  required
                  value={newFeatTitle}
                  onChange={(e) => setNewFeatTitle(e.target.value)}
                  placeholder="e.g. Multi-Region Failover Router"
                  className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-2xs"
                />
              </div>

              <div>
                <label className="block text-xs font-mono uppercase text-slate-600 font-semibold mb-1">
                  Scope Summary
                </label>
                <textarea
                  rows={2}
                  value={newFeatSummary}
                  onChange={(e) => setNewFeatSummary(e.target.value)}
                  placeholder="Brief description of what we're building..."
                  className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-2xs"
                />
              </div>

              <div>
                <label className="block text-xs font-mono uppercase text-slate-600 font-semibold mb-1">
                  Current Owner
                </label>
                <input
                  type="text"
                  value={newFeatOwner}
                  onChange={(e) => setNewFeatOwner(e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-2xs"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-mono uppercase text-slate-600 font-semibold mb-1">
                    Target Date
                  </label>
                  <input
                    type="date"
                    value={newFeatTargetDate}
                    onChange={(e) => setNewFeatTargetDate(e.target.value)}
                    className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-sm text-slate-900 font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-2xs"
                  />
                </div>
                <div>
                  <label className="block text-xs font-mono uppercase text-slate-600 font-semibold mb-1">
                    Projected Date
                  </label>
                  <input
                    type="date"
                    value={newFeatExpectedDate}
                    onChange={(e) => setNewFeatExpectedDate(e.target.value)}
                    className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-sm text-slate-900 font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-2xs"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-mono text-slate-500 font-medium mb-1">
                  Custom Stages (Optional — comma-separated; leave blank for default 7-stage Architect Lifecycle)
                </label>
                <input
                  type="text"
                  value={newFeatCustomStages}
                  onChange={(e) => setNewFeatCustomStages(e.target.value)}
                  placeholder="Default: Brainstorming, design.md, Handed to Dev, Prototype Demo, Dev Deploy, Bugfixes, Prod"
                  className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-2xs"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowNewFeatureModal(false)}
                  className="px-4 py-2 rounded-lg bg-white hover:bg-slate-50 border border-slate-300 text-xs font-semibold text-slate-700 shadow-2xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-xs"
                >
                  Create Flowchart
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 5: Create New Project */}
      {showNewProjectModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <h3 className="text-lg font-bold text-slate-900">Create New Project</h3>
              <button
                onClick={() => setShowNewProjectModal(false)}
                className="p-1.5 rounded-lg bg-slate-100 text-slate-500 hover:text-slate-800 hover:bg-slate-200 transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleCreateProject} className="space-y-3.5">
              <div>
                <label className="block text-xs font-mono uppercase text-slate-600 font-semibold mb-1">
                  Project Name *
                </label>
                <input
                  type="text"
                  required
                  value={newProjName}
                  onChange={(e) => setNewProjName(e.target.value)}
                  placeholder="e.g. Mobile App v3 Rebuild"
                  className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-2xs"
                />
              </div>
              <div>
                <label className="block text-xs font-mono uppercase text-slate-600 font-semibold mb-1">
                  Description
                </label>
                <textarea
                  rows={2}
                  value={newProjDesc}
                  onChange={(e) => setNewProjDesc(e.target.value)}
                  placeholder="High-level architectural goals..."
                  className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-2xs"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowNewProjectModal(false)}
                  className="px-4 py-2 rounded-lg bg-white hover:bg-slate-50 border border-slate-300 text-xs font-semibold text-slate-700 shadow-2xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-xs"
                >
                  Create Project
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 6: Join or Request Project */}
      {showJoinModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <div className="flex items-center gap-2">
                <UserPlus className="w-5 h-5 text-indigo-600" />
                <h3 className="text-lg font-bold text-slate-900">
                  Join or Request Project
                </h3>
              </div>
              <button
                onClick={() => setShowJoinModal(false)}
                className="p-1.5 rounded-lg bg-slate-100 text-slate-500 hover:text-slate-800 hover:bg-slate-200 transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Sub-tabs */}
            <div className="flex border-b border-slate-200 gap-1 pb-1">
              <button
                onClick={() => {
                  setJoinModalTab("code");
                  setJoinErrorMessage(null);
                  setJoinMessage(null);
                }}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                  joinModalTab === "code"
                    ? "bg-indigo-50 text-indigo-700 border border-indigo-200"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                Enter Invite Code
              </button>
              <button
                onClick={() => {
                  setJoinModalTab("request");
                  setJoinErrorMessage(null);
                  setJoinMessage(null);
                }}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                  joinModalTab === "request"
                    ? "bg-indigo-50 text-indigo-700 border border-indigo-200"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                Request Access by Slug
              </button>
            </div>

            {joinMessage && (
              <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>{joinMessage}</span>
              </div>
            )}

            {joinErrorMessage && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                <span>{joinErrorMessage}</span>
              </div>
            )}

            {joinModalTab === "code" ? (
              <form onSubmit={handleJoinWithCode} className="space-y-3.5">
                <div>
                  <label className="block text-xs font-mono uppercase text-slate-600 font-semibold mb-1">
                    Project Invite Code *
                  </label>
                  <input
                    type="text"
                    required
                    value={joinCodeInput}
                    onChange={(e) => setJoinCodeInput(e.target.value.toUpperCase())}
                    placeholder="e.g. KZ-7X9B2"
                    className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-sm font-mono text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-2xs uppercase tracking-wider"
                  />
                  <p className="text-[11px] text-slate-500 mt-1">
                    Ask the project owner for their 5-character project invite code.
                  </p>
                </div>
                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowJoinModal(false)}
                    className="px-4 py-2 rounded-lg bg-white hover:bg-slate-50 border border-slate-300 text-xs font-semibold text-slate-700 shadow-2xs"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isLoading || !joinCodeInput.trim()}
                    className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-xs font-semibold shadow-xs"
                  >
                    {isLoading ? "Joining..." : "Join Project"}
                  </button>
                </div>
              </form>
            ) : (
              <form onSubmit={handleRequestAccess} className="space-y-3.5">
                <div>
                  <label className="block text-xs font-mono uppercase text-slate-600 font-semibold mb-1">
                    Project Slug or ID *
                  </label>
                  <input
                    type="text"
                    required
                    value={requestSlugInput}
                    onChange={(e) => setRequestSlugInput(e.target.value)}
                    placeholder="e.g. keyzor-product-roadmap"
                    className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-sm font-mono text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-2xs"
                  />
                  <p className="text-[11px] text-slate-500 mt-1">
                    The project owner will receive an access request notification in their dashboard.
                  </p>
                </div>
                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowJoinModal(false)}
                    className="px-4 py-2 rounded-lg bg-white hover:bg-slate-50 border border-slate-300 text-xs font-semibold text-slate-700 shadow-2xs"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isLoading || !requestSlugInput.trim()}
                    className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-xs font-semibold shadow-xs"
                  >
                    {isLoading ? "Submitting..." : "Submit Access Request"}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* MODAL 7: Delete Project Confirmation */}
      {showDeleteProjectConfirm && currentProject && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white border border-rose-200 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center gap-2.5 text-rose-600">
              <Trash2 className="w-5 h-5 shrink-0" />
              <h3 className="text-lg font-bold text-slate-900">
                Delete Project &lsquo;{currentProject.name}&rsquo;?
              </h3>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              This action is permanent and can only be performed by the project owner. It will permanently delete this project, all associated feature flowcharts, Gantt schedules, resource links, and access history.
            </p>
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowDeleteProjectConfirm(false)}
                className="px-4 py-2 rounded-lg bg-white hover:bg-slate-50 border border-slate-300 text-xs font-semibold text-slate-700 shadow-2xs"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteProject}
                disabled={isLoading}
                className="px-4 py-2 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold shadow-xs"
              >
                {isLoading ? "Deleting..." : "Permanently Delete Project"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
