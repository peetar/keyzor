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
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900">
      {/* Top Read-Only Stakeholder Banner */}
      <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-purple-200/80 px-6 py-4 shadow-xs">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-purple-50 border border-purple-200 flex items-center justify-center text-purple-700 font-bold text-base shadow-xs">
              K
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold tracking-tight text-slate-900 text-base">
                  {project.name}
                </span>
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-mono font-semibold bg-purple-50 text-purple-700 border border-purple-200">
                  <ShieldCheck className="w-3.5 h-3.5 text-purple-600" /> Read-Only Stakeholder Presentation View
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                {project.description}
              </p>
            </div>
          </div>

          {/* View Toggle for Stakeholders */}
          <div className="inline-flex rounded-xl bg-slate-100 p-1 border border-slate-200 shadow-2xs">
            <button
              onClick={() => setViewMode("gantt")}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition ${
                viewMode === "gantt"
                  ? "bg-purple-600 text-white font-semibold shadow-xs"
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
                  ? "bg-purple-600 text-white font-semibold shadow-xs"
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
                  ? "bg-purple-600 text-white font-semibold shadow-xs"
                  : "text-slate-600 hover:text-slate-900"
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
        <div className="bg-white border border-slate-200/90 rounded-2xl overflow-hidden shadow-xs">
          <div className="px-5 py-3.5 bg-purple-50/70 border-b border-purple-100 flex items-center justify-between">
            <h2 className="text-xs font-mono uppercase tracking-wider text-purple-900 font-bold">
              Executive Summary
            </h2>
            <span className="inline-flex items-center gap-1 text-[11px] text-purple-700 font-mono font-medium">
              <Lock className="w-3 h-3 text-purple-600" /> Verified Encrypted Share Link
            </span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-[11px] font-mono uppercase text-slate-600 bg-slate-50 font-semibold">
                  <th className="py-2.5 px-4">Feature</th>
                  <th className="py-2.5 px-4">1. Where is it?</th>
                  <th className="py-2.5 px-4">2. Who is working on it?</th>
                  <th className="py-2.5 px-4">3. Target Date</th>
                  <th className="py-2.5 px-4">4. Expected Date</th>
                  <th className="py-2.5 px-4">Deliverable Links</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200/80">
                {project.features.map((feat) => (
                  <tr key={feat.id} className="hover:bg-slate-50/70 transition">
                    <td className="py-3 px-4 font-bold text-slate-900">
                      <div>{feat.title}</div>
                      <div className="text-xs text-slate-500 font-normal">
                        {feat.summary}
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-indigo-50 border border-indigo-200 text-indigo-700 text-xs font-semibold">
                        {feat.fourQuestions.where.stageName} (
                        {feat.fourQuestions.where.percentComplete}%)
                      </span>
                    </td>
                    <td className="py-3 px-4 text-xs text-slate-700 font-medium">
                      {feat.fourQuestions.who}
                    </td>
                    <td className="py-3 px-4 font-mono text-xs text-slate-600 font-semibold">
                      {feat.fourQuestions.whenWantDone || "—"}
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs text-slate-900 font-bold">
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
                          <span className="text-xs text-slate-400">—</span>
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
              className="bg-white border border-slate-200/90 rounded-2xl overflow-hidden shadow-xs hover:shadow-sm transition"
            >
              <div className="px-5 py-4 bg-white border-b border-slate-200 flex flex-wrap items-center justify-between gap-4">
                <div>
                  <h3 className="text-lg font-bold text-slate-900">
                    {feature.title}
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
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
                <div className="border-b border-slate-200/80">
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
