"use client";

import React, { useState } from "react";
import type { EnrichedProject } from "@/lib/services/lifecycle-service";
import {
  FourQuestionsCardRow,
  FeatureFlowchartView,
  FeatureGanttView,
  LinkBadge,
  ScheduleHealthBadge,
} from "./flowchart-gantt-views";
import {
  ShieldCheck,
  BarChart3,
  GitCommitHorizontal,
  Layers,
  Lock,
} from "lucide-react";

export function StakeholderShareView({
  project,
}: {
  project: EnrichedProject;
}) {
  const [viewMode, setViewMode] = useState<"gantt" | "flowchart" | "both">(
    "both"
  );

  return (
    <div className="min-h-screen flex flex-col bg-[#090D16] text-slate-100">
      {/* Top Read-Only Stakeholder Banner */}
      <header className="sticky top-0 z-30 bg-[#090D16]/95 backdrop-blur-md border-b border-violet-500/30 px-6 py-4">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-violet-500/20 border border-violet-400/40 flex items-center justify-center text-violet-300 font-bold text-sm">
              K
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold tracking-tight text-white">
                  {project.name}
                </span>
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-mono bg-violet-500/15 text-violet-300 border border-violet-500/30">
                  <ShieldCheck className="w-3.5 h-3.5" /> Read-Only Stakeholder Presentation View
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                {project.description}
              </p>
            </div>
          </div>

          {/* View Toggle for Stakeholders */}
          <div className="inline-flex rounded-xl bg-slate-950 p-1 border border-slate-800">
            <button
              onClick={() => setViewMode("gantt")}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition ${
                viewMode === "gantt"
                  ? "bg-violet-500 text-slate-950 font-semibold"
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
                  ? "bg-violet-500 text-slate-950 font-semibold"
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
                  ? "bg-violet-500 text-slate-950 font-semibold"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              Combined View
            </button>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-7xl w-full mx-auto px-6 py-6 space-y-6">
        {/* Executive Summary Table */}
        <div className="bg-slate-900/40 border border-slate-800/90 rounded-2xl overflow-hidden">
          <div className="px-5 py-3 bg-slate-900/90 border-b border-slate-800 flex items-center justify-between">
            <h2 className="text-xs font-mono uppercase tracking-wider text-violet-300 font-semibold">
              Executive Status Summary — Where, Who & Expected Delivery
            </h2>
            <span className="inline-flex items-center gap-1 text-[11px] text-slate-400 font-mono">
              <Lock className="w-3 h-3 text-violet-400" /> Verified Encrypted Share Link
            </span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="border-b border-slate-800/80 text-[11px] font-mono uppercase text-slate-400 bg-slate-950/40">
                  <th className="py-2.5 px-4">Feature</th>
                  <th className="py-2.5 px-4">1. Where is it?</th>
                  <th className="py-2.5 px-4">2. Who is working on it?</th>
                  <th className="py-2.5 px-4">3. Target Date</th>
                  <th className="py-2.5 px-4">4. Expected Date</th>
                  <th className="py-2.5 px-4">Deliverable Links</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {project.features.map((feat) => (
                  <tr key={feat.id} className="hover:bg-slate-900/40">
                    <td className="py-3 px-4 font-semibold text-white">
                      <div>{feat.title}</div>
                      <div className="text-xs text-slate-400 font-normal">
                        {feat.summary}
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-sky-500/15 border border-sky-500/30 text-sky-300 text-xs font-medium">
                        {feat.fourQuestions.where.stageName} (
                        {feat.fourQuestions.where.percentComplete}%)
                      </span>
                    </td>
                    <td className="py-3 px-4 text-xs text-slate-200">
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
                    <td className="py-3 px-4">
                      <div className="flex flex-wrap gap-1.5">
                        {feat.links.map((l) => (
                          <LinkBadge key={l.id} link={l} />
                        ))}
                        {feat.links.length === 0 && (
                          <span className="text-xs text-slate-500">—</span>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Read-Only Feature Flowchart & Gantt Cards */}
        <div className="space-y-6">
          {project.features.map((feature) => (
            <section
              key={feature.id}
              className="bg-slate-900/50 border border-slate-800/90 rounded-2xl overflow-hidden"
            >
              <div className="px-5 py-4 bg-slate-900 border-b border-slate-800 flex flex-wrap items-center justify-between gap-4">
                <div>
                  <h3 className="text-lg font-bold text-white">
                    {feature.title}
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    {feature.summary}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  {feature.links.map((lnk) => (
                    <LinkBadge key={lnk.id} link={lnk} />
                  ))}
                </div>
              </div>

              <FourQuestionsCardRow feature={feature} readOnly />

              {(viewMode === "flowchart" || viewMode === "both") && (
                <div className="border-b border-slate-800/70">
                  <FeatureFlowchartView feature={feature} readOnly />
                </div>
              )}

              {(viewMode === "gantt" || viewMode === "both") && (
                <FeatureGanttView feature={feature} readOnly />
              )}
            </section>
          ))}
        </div>
      </main>
    </div>
  );
}
