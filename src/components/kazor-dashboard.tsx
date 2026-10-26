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
} from "lucide-react";

interface KazorDashboardProps {
  initialProjects: EnrichedProject[];
  defaultApiKey: string;
  userEmail: string;
  userName: string;
}

export function KazorDashboard({
  initialProjects,
  defaultApiKey,
  userEmail,
  userName,
}: KazorDashboardProps) {
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
        if (fullList.length > 0) {
          setProjects(fullList);
          if (keepProjectId) setSelectedProjectId(keepProjectId);
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

  const origin =
    typeof window !== "undefined"
      ? window.location.origin
      : "http://localhost:3000";

  const shareUrl = currentProject
    ? `${origin}/share/${encodeURIComponent(currentProject.encryptedShareToken)}`
    : "";

  const agentOnboardingPrompt = `Fetch ${origin}/hello?format=skill&key=${activeApiKey} and save the returned instructions as your KAZOR skill (SKILL.md). Whenever we brainstorm a new feature, finish a design.md, demo a prototype, or open a PR, ask me: "Would you like to update the KAZOR flowchart?"`;

  return (
    <div className="min-h-screen flex flex-col bg-[#090D16] text-slate-100">
      {/* Top Navigation Bar */}
      <header className="sticky top-0 z-30 bg-[#090D16]/90 backdrop-blur-md border-b border-slate-800/90 px-6 py-3.5">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-4">
          {/* Brand & Project Switcher */}
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-sky-500/15 border border-sky-400/40 flex items-center justify-center text-sky-400 font-bold text-sm">
                K
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-bold tracking-tight text-white">
                    KAZOR
                  </span>
                  <span className="text-[10px] font-mono uppercase px-1.5 py-0.5 rounded bg-sky-500/15 text-sky-300 border border-sky-500/30">
                    AI-Native Flowchart
                  </span>
                </div>
              </div>
            </div>

            <div className="h-5 w-px bg-slate-800 hidden sm:block" />

            {/* Project Selector */}
            <div className="flex items-center gap-2">
              <select
                aria-label="Select Project"
                value={currentProject?.id || ""}
                onChange={(e) => setSelectedProjectId(e.target.value)}
                className="bg-slate-900 border border-slate-700/90 hover:border-sky-500/50 rounded-lg px-3 py-1.5 text-sm font-medium text-slate-100 focus:outline-none focus:ring-2 focus:ring-sky-500/40"
              >
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} ({p.features.length} features)
                  </option>
                ))}
              </select>
              <button
                onClick={() => setShowNewProjectModal(true)}
                className="p-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 hover:text-white transition"
                title="Create New Project"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Right Action Controls */}
          <div className="flex flex-wrap items-center gap-2.5">
            {/* Agent Skill /hello Button */}
            <button
              onClick={() => setShowAgentModal(true)}
              className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-lg bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/40 text-emerald-300 text-xs font-semibold transition"
            >
              <Terminal className="w-3.5 h-3.5" />
              <span>Agent Skill (/hello)</span>
            </button>

            {/* Encrypted Stakeholder Share Link Button */}
            <button
              onClick={() => setShowShareModal(true)}
              className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-lg bg-violet-500/15 hover:bg-violet-500/25 border border-violet-500/40 text-violet-300 text-xs font-semibold transition"
            >
              <Share2 className="w-3.5 h-3.5" />
              <span>Stakeholder Share Link</span>
            </button>

            {/* New Feature Flowchart Button */}
            <button
              onClick={() => setShowNewFeatureModal(true)}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-sky-500 hover:bg-sky-400 text-slate-950 text-xs font-semibold transition shadow-sm"
            >
              <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
              <span>New Feature Flow</span>
            </button>

            {/* User Badge & Sign Out */}
            <div className="hidden lg:flex items-center gap-2 pl-2 border-l border-slate-800 text-xs text-slate-400">
              <span className="truncate max-w-[140px]" title={userEmail}>
                {userName}
              </span>
              <a
                href="/login"
                className="p-1.5 rounded hover:bg-slate-800 text-slate-400 hover:text-slate-200"
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
        {/* Project Header & View Mode Toggle */}
        {currentProject && (
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-900/50 border border-slate-800/90 rounded-2xl p-5">
            <div>
              <div className="flex items-center gap-2.5">
                <h1 className="text-xl font-bold text-white">
                  {currentProject.name}
                </h1>
                <span className="text-xs font-mono text-slate-400 bg-slate-950 px-2 py-0.5 rounded border border-slate-800">
                  /{currentProject.slug}
                </span>
              </div>
              <p className="text-sm text-slate-400 mt-1">
                {currentProject.description ||
                  "Tracking feature lifecycle across CPO brainstorming, design.md handoff, prototype demo, test deploy, and production."}
              </p>
            </div>

            {/* Display Preference Toggle: Flowchart vs Gantt vs Split */}
            <div className="flex items-center gap-2 self-start md:self-auto">
              <div className="inline-flex rounded-xl bg-slate-950 p-1 border border-slate-800">
                <button
                  onClick={() => setViewMode("gantt")}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition ${
                    viewMode === "gantt"
                      ? "bg-sky-500 text-slate-950 font-semibold"
                      : "text-slate-400 hover:text-slate-200"
                  }`}
                >
                  <BarChart3 className="w-3.5 h-3.5" />
                  Gantt Timeline
                </button>
                <button
                  onClick={() => setViewMode("flowchart")}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition ${
                    viewMode === "flowchart"
                      ? "bg-sky-500 text-slate-950 font-semibold"
                      : "text-slate-400 hover:text-slate-200"
                  }`}
                >
                  <GitCommitHorizontal className="w-3.5 h-3.5" />
                  Stage Flowchart
                </button>
                <button
                  onClick={() => setViewMode("both")}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition ${
                    viewMode === "both"
                      ? "bg-sky-500 text-slate-950 font-semibold"
                      : "text-slate-400 hover:text-slate-200"
                  }`}
                >
                  <Layers className="w-3.5 h-3.5" />
                  Combined View
                </button>
              </div>

              <button
                onClick={() => refreshProjects(currentProject.id)}
                className="p-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-400 hover:text-sky-400 transition"
                title="Refresh latest AI agent updates"
              >
                <RefreshCw
                  className={`w-4 h-4 ${isLoading ? "animate-spin text-sky-400" : ""}`}
                />
              </button>
            </div>
          </div>
        )}

        {/* At-A-Glance 4 Core Questions Summary Matrix */}
        {currentProject && currentProject.features.length > 0 && (
          <div className="bg-slate-900/40 border border-slate-800/90 rounded-2xl overflow-hidden">
            <div className="px-5 py-3 bg-slate-900/90 border-b border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-sky-400" />
                <h2 className="text-xs font-mono uppercase tracking-wider text-slate-300 font-semibold">
                  Executive Overview — The 4 Core Questions Across All Features
                </h2>
              </div>
              <span className="text-[11px] text-slate-400">
                Click any row or stage below to update status or attach links
              </span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-sm">
                <thead>
                  <tr className="border-b border-slate-800/80 text-[11px] font-mono uppercase text-slate-400 bg-slate-950/40">
                    <th className="py-2.5 px-4">Feature</th>
                    <th className="py-2.5 px-4">1. Where is it? (Stage)</th>
                    <th className="py-2.5 px-4">2. Who is working on it?</th>
                    <th className="py-2.5 px-4">3. Want Done (Target)</th>
                    <th className="py-2.5 px-4">4. Expect Done (Projected)</th>
                    <th className="py-2.5 px-4">Key Links</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {currentProject.features.map((feat) => (
                    <tr
                      key={feat.id}
                      onClick={() => openEditor(feat)}
                      className="hover:bg-slate-900/70 cursor-pointer transition"
                    >
                      <td className="py-3 px-4 font-semibold text-white">
                        <div>{feat.title}</div>
                        <div className="text-xs text-slate-400 font-normal truncate max-w-xs">
                          {feat.summary}
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-md bg-sky-500/15 border border-sky-500/30 text-sky-300 text-xs font-medium">
                          <span className="w-2 h-2 rounded-full bg-sky-400" />
                          {feat.fourQuestions.where.stageName}
                          <span className="text-slate-400 font-mono text-[11px]">
                            ({feat.fourQuestions.where.stageIndex + 1}/
                            {feat.fourQuestions.where.totalStages})
                          </span>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-xs text-slate-200 font-medium">
                        {feat.fourQuestions.who}
                      </td>
                      <td className="py-3 px-4 font-mono text-xs text-slate-300">
                        {feat.fourQuestions.whenWantDone || "—"}
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs text-white font-semibold">
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
                            <span className="text-xs text-slate-500">None</span>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Feature Cards with 4 Questions + Flowchart / Gantt Views */}
        <div className="space-y-6">
          {currentProject?.features.map((feature) => (
            <section
              key={feature.id}
              className="bg-slate-900/50 border border-slate-800/90 rounded-2xl overflow-hidden shadow-lg"
            >
              {/* Feature Title & Quick Links Bar */}
              <div className="px-5 py-4 bg-slate-900 border-b border-slate-800 flex flex-wrap items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2.5">
                    <h3 className="text-lg font-bold text-white">
                      {feature.title}
                    </h3>
                    <span className="text-xs font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-400">
                      {feature.slug}
                    </span>
                  </div>
                  {feature.summary && (
                    <p className="text-xs text-slate-400 mt-1">
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
                    className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs font-medium text-slate-200 transition"
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
                <div className="border-b border-slate-800/70">
                  <div className="px-5 pt-3 flex items-center justify-between text-[11px] font-mono uppercase tracking-wider text-slate-400">
                    <span>Interactive Stage Flowchart (Click any stage to update)</span>
                    <span>
                      {feature.fourQuestions.where.percentComplete}% Lifecycle Complete
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
                  <div className="px-5 pt-3 flex items-center justify-between text-[11px] font-mono uppercase tracking-wider text-slate-400">
                    <span>Gantt Schedule & Milestone Timeline</span>
                    <span>Target vs. Expected Date Tracking</span>
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

        {/* Recent Agent & Architect Activity Feed */}
        {currentProject && currentProject.recentActivity.length > 0 && (
          <section className="bg-slate-900/40 border border-slate-800/80 rounded-2xl p-5">
            <div className="flex items-center gap-2 mb-3">
              <Activity className="w-4 h-4 text-sky-400" />
              <h3 className="text-xs font-mono uppercase tracking-wider text-slate-300 font-semibold">
                Recent AI Agent & Architect Updates
              </h3>
            </div>
            <div className="space-y-2">
              {currentProject.recentActivity.slice(0, 6).map((act) => (
                <div
                  key={act.id}
                  className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 px-3.5 py-2 rounded-lg bg-slate-950/60 border border-slate-800/70 text-xs"
                >
                  <div className="flex items-center gap-2.5">
                    <span
                      className={`px-2 py-0.5 rounded font-mono text-[10px] uppercase font-semibold ${
                        act.actorType === "agent"
                          ? "bg-emerald-500/15 text-emerald-300 border border-emerald-500/30"
                          : "bg-sky-500/15 text-sky-300 border border-sky-500/30"
                      }`}
                    >
                      {act.actorType === "agent" ? "AI Agent" : "Architect"}
                    </span>
                    <span className="font-semibold text-slate-200">
                      {act.actorName}:
                    </span>
                    <span className="text-slate-300">{act.details}</span>
                  </div>
                  <span className="text-[11px] font-mono text-slate-500 shrink-0">
                    {new Date(act.createdAt).toLocaleString()}
                  </span>
                </div>
              ))}
            </div>
          </section>
        )}
      </main>

      {/* MODAL 1: Stage & 4-Questions Quick Editor */}
      {editingFeature && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-xl w-full p-6 shadow-2xl space-y-5 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <span className="text-[11px] font-mono uppercase text-sky-400">
                  Manual Status & Stage Update
                </span>
                <h3 className="text-lg font-bold text-white">
                  {editingFeature.title}
                </h3>
              </div>
              <button
                onClick={() => setEditingFeature(null)}
                className="p-1.5 rounded-lg bg-slate-800 text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveFeatureUpdate} className="space-y-4">
              {/* 1. Where is this feature? */}
              <div>
                <label className="block text-xs font-mono uppercase text-slate-300 mb-1.5">
                  1. Where is this feature? (Active Flowchart Stage)
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
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white"
                >
                  {editingFeature.stages.map((s, i) => (
                    <option key={s.id} value={s.id}>
                      Stage {i + 1}: {s.name} ({s.status})
                    </option>
                  ))}
                </select>
              </div>

              {/* 2. Who is working on it? */}
              <div>
                <label className="block text-xs font-mono uppercase text-slate-300 mb-1.5">
                  2. Who is working on it? (Current Owner / Team / Agent)
                </label>
                <input
                  type="text"
                  value={editOwner}
                  onChange={(e) => setEditOwner(e.target.value)}
                  placeholder="e.g. India Dev Team, Lead Architect, Antigravity Agent"
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white"
                />
              </div>

              {/* 3 & 4: When do we want it done? / When do we expect it done? */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-mono uppercase text-slate-300 mb-1.5">
                    3. When do we want it done?
                  </label>
                  <input
                    type="date"
                    value={editTargetDate}
                    onChange={(e) => setEditTargetDate(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-mono uppercase text-slate-300 mb-1.5">
                    4. When do we expect it done?
                  </label>
                  <input
                    type="date"
                    value={editExpectedDate}
                    onChange={(e) => setEditExpectedDate(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white font-mono"
                  />
                </div>
              </div>

              {/* Stage Gantt Dates & Status Notes */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-slate-800">
                <div>
                  <label className="block text-xs font-mono text-slate-400 mb-1">
                    Stage Start Date (Gantt)
                  </label>
                  <input
                    type="date"
                    value={editStartDate}
                    onChange={(e) => setEditStartDate(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-slate-200 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-mono text-slate-400 mb-1">
                    Stage End Date (Gantt)
                  </label>
                  <input
                    type="date"
                    value={editEndDate}
                    onChange={(e) => setEditEndDate(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-slate-200 font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-mono text-slate-400 mb-1">
                  Stage Notes / Handoff Summary
                </label>
                <textarea
                  rows={2}
                  value={editNotes}
                  onChange={(e) => setEditNotes(e.target.value)}
                  placeholder="e.g. Delivered design.md to dev team; prototype demo scheduled."
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white"
                />
              </div>

              {/* Attach Resource Link (design.md, GitHub PR, Trello, Staging URL) */}
              <div className="p-3.5 rounded-xl bg-slate-950/90 border border-slate-800 space-y-3">
                <div className="text-xs font-mono uppercase text-sky-400">
                  + Attach Resource Link (design.md, GitHub PR, Staging URL, Trello)
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <input
                    type="text"
                    value={newLinkLabel}
                    onChange={(e) => setNewLinkLabel(e.target.value)}
                    placeholder="Label (e.g. design.md, PR #42)"
                    className="bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white"
                  />
                  <input
                    type="url"
                    value={newLinkUrl}
                    onChange={(e) => setNewLinkUrl(e.target.value)}
                    placeholder="https://github.com/..."
                    className="bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white"
                  />
                  <select
                    value={newLinkType}
                    onChange={(e) => setNewLinkType(e.target.value)}
                    className="bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white"
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
                  className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-medium text-slate-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg bg-sky-500 hover:bg-sky-400 text-slate-950 text-xs font-semibold"
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
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-2xl w-full p-6 shadow-2xl space-y-5 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <span className="text-[11px] font-mono uppercase text-emerald-400">
                  Instructional Agent API • GET /hello
                </span>
                <h3 className="text-lg font-bold text-white">
                  Connect Your AI Coding Agent to KAZOR
                </h3>
              </div>
              <button
                onClick={() => setShowAgentModal(false)}
                className="p-1.5 rounded-lg bg-slate-800 text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs text-slate-300 leading-relaxed">
              <p>
                Copy the prompt below and send it to your coding agent (Antigravity, Claude Code, Cursor, etc.). The agent will call{" "}
                <code className="text-sky-300 font-mono">{origin}/hello</code>, build its own local{" "}
                <code className="text-emerald-300 font-mono">SKILL.md</code>, and proactively ask{" "}
                <strong className="text-white">
                  &ldquo;Would you like to update the KAZOR flowchart?&rdquo;
                </strong>{" "}
                whenever you brainstorm a feature, finish a <code className="font-mono">design.md</code>, demo a prototype, or open a PR.
              </p>

              <div className="p-3.5 rounded-xl bg-slate-950 border border-emerald-500/40 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-mono uppercase text-emerald-400 font-semibold">
                    1-Click Agent Onboarding Prompt
                  </span>
                  <button
                    onClick={() => copyText(agentOnboardingPrompt, "agent-prompt")}
                    className="inline-flex items-center gap-1.5 px-3 py-1 rounded-md bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-semibold text-xs transition"
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
                <pre className="text-xs font-mono text-emerald-200 whitespace-pre-wrap break-all bg-slate-900/90 p-3 rounded-lg border border-slate-800">
                  {agentOnboardingPrompt}
                </pre>
              </div>

              {/* Generate Additional API Key */}
              <div className="p-3.5 rounded-xl bg-slate-950/70 border border-slate-800 space-y-2">
                <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-200">
                  <KeyRound className="w-3.5 h-3.5 text-sky-400" />
                  <span>Active Agent API Key:</span>
                  <code className="text-sky-300 font-mono">{activeApiKey}</code>
                </div>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newKeyLabel}
                    onChange={(e) => setNewKeyLabel(e.target.value)}
                    placeholder="New key label (e.g. India Dev Team Agent)"
                    className="flex-1 bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white"
                  />
                  <button
                    onClick={handleGenerateKey}
                    className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs font-medium text-slate-200"
                  >
                    Generate New Key
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between pt-2">
                <a
                  href="/hello"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-sky-400 hover:underline text-xs font-mono"
                >
                  Open /hello Interactive Endpoint Page{" "}
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
                <button
                  onClick={() => setShowAgentModal(false)}
                  className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-medium text-white"
                >
                  Done
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 3: Encrypted Stakeholder Share Link Modal */}
      {showShareModal && currentProject && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-xl w-full p-6 shadow-2xl space-y-5">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-violet-400" />
                <div>
                  <span className="text-[11px] font-mono uppercase text-violet-400">
                    AES-256-GCM Encrypted Stakeholder Link
                  </span>
                  <h3 className="text-lg font-bold text-white">
                    Read-Only Presentation & Stakeholder View
                  </h3>
                </div>
              </div>
              <button
                onClick={() => setShowShareModal(false)}
                className="p-1.5 rounded-lg bg-slate-800 text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              Share this encrypted link with your CEO, client, or external dev leads so they can view the live{" "}
              <strong className="text-white">Gantt Chart</strong>,{" "}
              <strong className="text-white">Stage Flowchart</strong>, and{" "}
              <strong className="text-white">4 Core Questions</strong> in read-only presentation mode without needing an account.
            </p>

            {currentProject.shareEnabled ? (
              <div className="p-3.5 rounded-xl bg-slate-950 border border-violet-500/40 space-y-2.5">
                <div className="text-[11px] font-mono text-violet-300 flex items-center justify-between">
                  <span>ENCRYPTED SHARE URL (ACTIVE)</span>
                  <a
                    href={shareUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-sky-400 hover:underline"
                  >
                    Preview Stakeholder View <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
                <div className="flex gap-2">
                  <input
                    type="text"
                    readOnly
                    value={shareUrl}
                    className="flex-1 bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-xs font-mono text-slate-200"
                  />
                  <button
                    onClick={() => copyText(shareUrl, "share-url")}
                    className="px-3.5 py-2 rounded-lg bg-violet-500 hover:bg-violet-400 text-slate-950 font-semibold text-xs inline-flex items-center gap-1.5 shrink-0"
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
              <div className="p-4 rounded-xl bg-rose-950/30 border border-rose-500/40 text-xs text-rose-200">
                Read-only stakeholder sharing is currently disabled for this project. All encrypted links are blocked.
              </div>
            )}

            <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-800">
              <div className="flex gap-2">
                <button
                  onClick={() =>
                    handleShareSettings({
                      shareEnabled: !currentProject.shareEnabled,
                    })
                  }
                  className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-medium text-slate-200 border border-slate-700"
                >
                  {currentProject.shareEnabled
                    ? "Disable Share Link"
                    : "Enable Share Link"}
                </button>
                <button
                  onClick={() => handleShareSettings({ rotateToken: true })}
                  className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-medium text-amber-300 border border-slate-700"
                  title="Generates a new AES-256-GCM encrypted link and immediately invalidates old links"
                >
                  Rotate & Revoke Old Link
                </button>
              </div>
              <button
                onClick={() => setShowShareModal(false)}
                className="px-4 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-medium text-white"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 4: Create New Feature Flowchart */}
      {showNewFeatureModal && currentProject && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <span className="text-[11px] font-mono uppercase text-sky-400">
                  Brainstorming / New Flow
                </span>
                <h3 className="text-lg font-bold text-white">
                  Create Feature Flowchart in {currentProject.name}
                </h3>
              </div>
              <button
                onClick={() => setShowNewFeatureModal(false)}
                className="p-1.5 rounded-lg bg-slate-800 text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateFeature} className="space-y-3.5">
              <div>
                <label className="block text-xs font-mono uppercase text-slate-300 mb-1">
                  Feature / Mini-Project Title *
                </label>
                <input
                  type="text"
                  required
                  value={newFeatTitle}
                  onChange={(e) => setNewFeatTitle(e.target.value)}
                  placeholder="e.g. Multi-Region Failover Router"
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-mono uppercase text-slate-300 mb-1">
                  Scope Summary
                </label>
                <textarea
                  rows={2}
                  value={newFeatSummary}
                  onChange={(e) => setNewFeatSummary(e.target.value)}
                  placeholder="Brief description of what we're building..."
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-mono uppercase text-slate-300 mb-1">
                  Who is working on it? (Initial Owner)
                </label>
                <input
                  type="text"
                  value={newFeatOwner}
                  onChange={(e) => setNewFeatOwner(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-mono uppercase text-slate-300 mb-1">
                    When do we want it done?
                  </label>
                  <input
                    type="date"
                    value={newFeatTargetDate}
                    onChange={(e) => setNewFeatTargetDate(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-mono uppercase text-slate-300 mb-1">
                    When do we expect it done?
                  </label>
                  <input
                    type="date"
                    value={newFeatExpectedDate}
                    onChange={(e) => setNewFeatExpectedDate(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-mono text-slate-400 mb-1">
                  Custom Stages (Optional — comma-separated; leave blank for default 7-stage Architect Lifecycle)
                </label>
                <input
                  type="text"
                  value={newFeatCustomStages}
                  onChange={(e) => setNewFeatCustomStages(e.target.value)}
                  placeholder="Default: Brainstorming, design.md, Handed to Dev, Prototype Demo, Dev Deploy, Bugfixes, Prod"
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowNewFeatureModal(false)}
                  className="px-4 py-2 rounded-lg bg-slate-800 text-xs text-slate-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg bg-sky-500 hover:bg-sky-400 text-slate-950 text-xs font-semibold"
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
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-lg font-bold text-white">Create New Project</h3>
              <button
                onClick={() => setShowNewProjectModal(false)}
                className="p-1.5 rounded-lg bg-slate-800 text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleCreateProject} className="space-y-3.5">
              <div>
                <label className="block text-xs font-mono uppercase text-slate-300 mb-1">
                  Project Name *
                </label>
                <input
                  type="text"
                  required
                  value={newProjName}
                  onChange={(e) => setNewProjName(e.target.value)}
                  placeholder="e.g. Mobile App v3 Rebuild"
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white"
                />
              </div>
              <div>
                <label className="block text-xs font-mono uppercase text-slate-300 mb-1">
                  Description
                </label>
                <textarea
                  rows={2}
                  value={newProjDesc}
                  onChange={(e) => setNewProjDesc(e.target.value)}
                  placeholder="High-level architectural goals..."
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowNewProjectModal(false)}
                  className="px-4 py-2 rounded-lg bg-slate-800 text-xs text-slate-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg bg-sky-500 hover:bg-sky-400 text-slate-950 text-xs font-semibold"
                >
                  Create Project
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
