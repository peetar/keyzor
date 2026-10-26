"use client";

import React from "react";
import type {
  EnrichedFeature,
  EnrichedStage,
} from "@/lib/services/lifecycle-service";
import {
  CheckCircle2,
  CircleDot,
  Clock,
  ExternalLink,
  FileCode2,
  GitPullRequest,
  Globe,
  Trello,
  Link2,
  User,
  Calendar,
  AlertTriangle,
  ArrowRight,
  Sparkles,
} from "lucide-react";

export function LinkBadge({
  link,
}: {
  link: { label: string; url: string; linkType: string; createdBy?: string };
}) {
  const getIcon = () => {
    switch (link.linkType) {
      case "design_doc":
        return <FileCode2 className="w-3.5 h-3.5 text-violet-400" />;
      case "github":
        return <GitPullRequest className="w-3.5 h-3.5 text-sky-400" />;
      case "preview_url":
        return <Globe className="w-3.5 h-3.5 text-emerald-400" />;
      case "trello":
        return <Trello className="w-3.5 h-3.5 text-amber-400" />;
      default:
        return <Link2 className="w-3.5 h-3.5 text-slate-400" />;
    }
  };

  return (
    <a
      href={link.url}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-slate-800/90 hover:bg-slate-700/90 border border-slate-700/80 hover:border-sky-500/50 text-xs text-slate-200 transition group"
      title={`Added by ${link.createdBy || "Agent"} • ${link.url}`}
    >
      {getIcon()}
      <span className="truncate max-w-[180px] font-medium">{link.label}</span>
      <ExternalLink className="w-3 h-3 text-slate-500 group-hover:text-sky-400 transition" />
    </a>
  );
}

export function ScheduleHealthBadge({
  feature,
}: {
  feature: EnrichedFeature;
}) {
  const { scheduleHealth, scheduleVarianceDays } = feature.fourQuestions;

  if (scheduleHealth === "slipping" && scheduleVarianceDays !== null) {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-amber-500/15 text-amber-300 border border-amber-500/30">
        <AlertTriangle className="w-3 h-3" />+{scheduleVarianceDays}d Slipping
      </span>
    );
  }
  if (scheduleHealth === "early" && scheduleVarianceDays !== null) {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
        {Math.abs(scheduleVarianceDays)}d Ahead
      </span>
    );
  }
  if (scheduleHealth === "on_track") {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-sky-500/15 text-sky-300 border border-sky-500/30">
        On Track
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-slate-800 text-slate-400 border border-slate-700">
      TBD
    </span>
  );
}

export function FourQuestionsCardRow({
  feature,
  readOnly,
  onSelectStage,
  onQuickAdvance,
  onOpenEditModal,
}: {
  feature: EnrichedFeature;
  readOnly?: boolean;
  onSelectStage?: (feature: EnrichedFeature, stage: EnrichedStage) => void;
  onQuickAdvance?: (feature: EnrichedFeature) => void;
  onOpenEditModal?: (feature: EnrichedFeature) => void;
}) {
  const q = feature.fourQuestions;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 p-4 bg-slate-950/60 border-b border-slate-800/80">
      {/* 1. WHERE IS THIS FEATURE? */}
      <div className="bg-slate-900/80 border border-slate-800/90 rounded-lg p-3 flex flex-col justify-between">
        <div className="flex items-center justify-between text-[11px] font-mono uppercase tracking-wider text-slate-400 mb-1">
          <span>1. Where is this feature?</span>
          <span className="text-sky-400 font-semibold">
            {q.where.stageIndex + 1}/{q.where.totalStages} ({q.where.percentComplete}%)
          </span>
        </div>
        <div className="flex items-center justify-between gap-2 mt-1">
          <div className="flex items-center gap-2 min-w-0">
            <span className="w-2.5 h-2.5 rounded-full bg-sky-400 animate-pulse shrink-0" />
            <span className="text-sm font-semibold text-white truncate">
              {q.where.stageName}
            </span>
          </div>
          {!readOnly && onQuickAdvance && q.where.stageIndex + 1 < q.where.totalStages && (
            <button
              onClick={() => onQuickAdvance(feature)}
              className="px-2 py-1 rounded bg-sky-500/15 hover:bg-sky-500/25 border border-sky-500/30 text-sky-300 text-xs font-medium inline-flex items-center gap-1 shrink-0 transition"
              title="Advance to next stage in 1 click"
            >
              Advance <ArrowRight className="w-3 h-3" />
            </button>
          )}
        </div>
      </div>

      {/* 2. WHO IS WORKING ON IT? */}
      <div className="bg-slate-900/80 border border-slate-800/90 rounded-lg p-3 flex flex-col justify-between">
        <div className="flex items-center justify-between text-[11px] font-mono uppercase tracking-wider text-slate-400 mb-1">
          <span>2. Who is working on it?</span>
          <User className="w-3.5 h-3.5 text-violet-400" />
        </div>
        <div className="flex items-center justify-between gap-2 mt-1">
          <span className="text-sm font-semibold text-slate-100 truncate">
            {q.who}
          </span>
          {!readOnly && onOpenEditModal && (
            <button
              onClick={() => onOpenEditModal(feature)}
              className="text-[11px] text-slate-400 hover:text-sky-400 underline shrink-0"
            >
              Edit
            </button>
          )}
        </div>
      </div>

      {/* 3. WHEN DO WE WANT IT DONE? */}
      <div className="bg-slate-900/80 border border-slate-800/90 rounded-lg p-3 flex flex-col justify-between">
        <div className="flex items-center justify-between text-[11px] font-mono uppercase tracking-wider text-slate-400 mb-1">
          <span>3. When do we want it done?</span>
          <Calendar className="w-3.5 h-3.5 text-slate-400" />
        </div>
        <div className="flex items-center justify-between gap-2 mt-1">
          <span className="text-sm font-mono font-semibold text-slate-200">
            {q.whenWantDone || "Not set"}
          </span>
          <span className="text-[11px] text-slate-500">Target Deadline</span>
        </div>
      </div>

      {/* 4. WHEN DO WE EXPECT IT TO BE DONE? */}
      <div className="bg-slate-900/80 border border-slate-800/90 rounded-lg p-3 flex flex-col justify-between">
        <div className="flex items-center justify-between text-[11px] font-mono uppercase tracking-wider text-slate-400 mb-1">
          <span>4. When do we expect it done?</span>
          <ScheduleHealthBadge feature={feature} />
        </div>
        <div className="flex items-center justify-between gap-2 mt-1">
          <span className="text-sm font-mono font-semibold text-white">
            {q.whenExpectDone || "Not set"}
          </span>
          {!readOnly && onOpenEditModal && (
            <button
              onClick={() => onOpenEditModal(feature)}
              className="text-[11px] text-slate-400 hover:text-sky-400 underline shrink-0"
            >
              Update Date
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export function FeatureFlowchartView({
  feature,
  readOnly,
  onSelectStage,
}: {
  feature: EnrichedFeature;
  readOnly?: boolean;
  onSelectStage?: (feature: EnrichedFeature, stage: EnrichedStage) => void;
}) {
  return (
    <div className="p-5 overflow-x-auto">
      <div className="flex items-stretch gap-3 min-w-max">
        {feature.stages.map((stage, index) => {
          const isCompleted = stage.status === "completed";
          const isCurrent =
            stage.id === feature.currentStageId || stage.status === "in_progress";

          return (
            <React.Fragment key={stage.id}>
              <div
                onClick={() => !readOnly && onSelectStage?.(feature, stage)}
                className={`w-64 rounded-xl p-4 border transition flex flex-col justify-between relative ${
                  !readOnly ? "cursor-pointer" : ""
                } ${
                  isCurrent
                    ? "bg-sky-950/30 border-sky-500/70 shadow-lg shadow-sky-500/10"
                    : isCompleted
                    ? "bg-emerald-950/20 border-emerald-500/35 hover:border-emerald-500/60"
                    : "bg-slate-900/50 border-slate-800/90 hover:border-slate-700"
                }`}
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <span className="text-[11px] font-mono text-slate-400">
                      STAGE {index + 1}
                    </span>
                    {isCompleted ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                        <CheckCircle2 className="w-3 h-3" /> Done
                      </span>
                    ) : isCurrent ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-sky-500/20 text-sky-300 border border-sky-400/40">
                        <CircleDot className="w-3 h-3 animate-spin" /> Active Now
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] text-slate-400 bg-slate-800/80">
                        <Clock className="w-3 h-3" /> Pending
                      </span>
                    )}
                  </div>

                  <h4 className="font-semibold text-sm text-slate-100 mb-1">
                    {stage.name}
                  </h4>

                  <div className="text-xs text-slate-400 flex items-center gap-1.5 mb-2">
                    <User className="w-3 h-3 text-slate-500 shrink-0" />
                    <span className="truncate">
                      {stage.owner || feature.currentOwner}
                    </span>
                  </div>

                  {stage.notes && (
                    <p className="text-xs text-slate-300 bg-slate-950/70 border border-slate-800/80 rounded-md p-2 mb-2 line-clamp-3">
                      {stage.notes}
                    </p>
                  )}

                  {stage.links.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      {stage.links.map((lnk) => (
                        <div
                          key={lnk.id}
                          onClick={(e) => e.stopPropagation()}
                        >
                          <LinkBadge link={lnk} />
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="mt-3 pt-2.5 border-t border-slate-800/70 flex items-center justify-between text-[11px] font-mono text-slate-400">
                  <span>
                    {stage.actualStartDate || stage.plannedStartDate || "—"}
                  </span>
                  <span>→</span>
                  <span>
                    {stage.actualEndDate || stage.plannedEndDate || "—"}
                  </span>
                </div>
              </div>

              {index < feature.stages.length - 1 && (
                <div className="flex items-center justify-center">
                  <div
                    className={`w-6 h-0.5 ${
                      isCompleted ? "bg-emerald-500/60" : "bg-slate-800"
                    }`}
                  />
                  <ArrowRight
                    className={`w-4 h-4 -ml-1 ${
                      isCompleted ? "text-emerald-400" : "text-slate-700"
                    }`}
                  />
                </div>
              )}
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
}

function parseDateMs(iso: string | null | undefined, fallbackMs: number): number {
  if (!iso) return fallbackMs;
  const ms = new Date(`${iso}T00:00:00Z`).getTime();
  return Number.isNaN(ms) ? fallbackMs : ms;
}

export function FeatureGanttView({
  feature,
  readOnly,
  onSelectStage,
}: {
  feature: EnrichedFeature;
  readOnly?: boolean;
  onSelectStage?: (feature: EnrichedFeature, stage: EnrichedStage) => void;
}) {
  const DAY_MS = 1000 * 60 * 60 * 24;
  const todayIso = new Date().toISOString().slice(0, 10);
  const todayMs = parseDateMs(todayIso, Date.now());

  // Determine overall timeline window across all stages + targetDate + expectedDate
  const allDatesMs: number[] = [todayMs - 5 * DAY_MS, todayMs + 14 * DAY_MS];
  if (feature.targetDate) {
    allDatesMs.push(parseDateMs(feature.targetDate, todayMs));
  }
  if (feature.expectedDate) {
    allDatesMs.push(parseDateMs(feature.expectedDate, todayMs));
  }

  feature.stages.forEach((s, idx) => {
    const fallbackStart = todayMs + (idx - 2) * 3 * DAY_MS;
    const fallbackEnd = fallbackStart + 3 * DAY_MS;
    allDatesMs.push(
      parseDateMs(s.actualStartDate || s.plannedStartDate, fallbackStart)
    );
    allDatesMs.push(
      parseDateMs(s.actualEndDate || s.plannedEndDate, fallbackEnd)
    );
  });

  const minMs = Math.min(...allDatesMs) - 2 * DAY_MS;
  const maxMs = Math.max(...allDatesMs) + 3 * DAY_MS;
  const totalSpanMs = Math.max(maxMs - minMs, 7 * DAY_MS);
  const totalDays = Math.round(totalSpanMs / DAY_MS);

  const toPercent = (ms: number) =>
    Math.max(0, Math.min(100, ((ms - minMs) / totalSpanMs) * 100));

  const todayPct = toPercent(todayMs);
  const targetPct = feature.targetDate
    ? toPercent(parseDateMs(feature.targetDate, todayMs))
    : null;
  const expectedPct = feature.expectedDate
    ? toPercent(parseDateMs(feature.expectedDate, todayMs))
    : null;

  // Generate tick labels every ~4 days
  const ticks: Array<{ label: string; pct: number }> = [];
  const stepDays = Math.max(2, Math.round(totalDays / 8));
  for (let d = 0; d <= totalDays; d += stepDays) {
    const tickMs = minMs + d * DAY_MS;
    const iso = new Date(tickMs).toISOString().slice(5, 10); // MM-DD
    ticks.push({ label: iso, pct: toPercent(tickMs) });
  }

  return (
    <div className="p-5">
      {/* Legend & Key Date Markers */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4 text-xs">
        <div className="flex flex-wrap items-center gap-4 text-slate-400">
          <span className="inline-flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-sm bg-emerald-500/80 inline-block" />
            Completed Stage
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-sm bg-sky-500 inline-block" />
            Active Stage ("Where")
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-sm bg-slate-700 border border-slate-600 inline-block" />
            Planned / Upcoming
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-4 font-mono text-[11px]">
          {feature.targetDate && (
            <span className="inline-flex items-center gap-1.5 text-violet-300">
              <span className="w-2 h-3 bg-violet-400 inline-block rounded-sm" />
              Want Done: {feature.targetDate}
            </span>
          )}
          {feature.expectedDate && (
            <span className="inline-flex items-center gap-1.5 text-amber-300">
              <span className="w-2 h-3 bg-amber-400 inline-block rounded-sm" />
              Expect Done: {feature.expectedDate}
            </span>
          )}
        </div>
      </div>

      {/* Gantt Chart Grid */}
      <div className="border border-slate-800 rounded-xl overflow-hidden bg-slate-950/60">
        {/* Timeline Header */}
        <div className="grid grid-cols-12 border-b border-slate-800 bg-slate-900/90 text-[11px] font-mono text-slate-400">
          <div className="col-span-4 sm:col-span-3 px-4 py-2.5 border-r border-slate-800 font-semibold text-slate-300">
            STAGE / OWNER
          </div>
          <div className="col-span-8 sm:col-span-9 relative h-9">
            {ticks.map((t, i) => (
              <div
                key={i}
                style={{ left: `${t.pct}%` }}
                className="absolute top-0 bottom-0 border-l border-slate-800/80 pl-1.5 pt-2 text-[10px] text-slate-500 select-none"
              >
                {t.label}
              </div>
            ))}
          </div>
        </div>

        {/* Stage Rows */}
        <div className="divide-y divide-slate-800/60 relative">
          {feature.stages.map((stage, idx) => {
            const isCompleted = stage.status === "completed";
            const isCurrent =
              stage.id === feature.currentStageId ||
              stage.status === "in_progress";

            const fallbackStart = minMs + (idx + 1) * 3 * DAY_MS;
            const startIso = stage.actualStartDate || stage.plannedStartDate;
            const endIso =
              stage.actualEndDate ||
              stage.plannedEndDate ||
              (startIso
                ? new Date(parseDateMs(startIso, fallbackStart) + 3 * DAY_MS)
                    .toISOString()
                    .slice(0, 10)
                : null);

            const startMs = parseDateMs(startIso, fallbackStart);
            const endMs = Math.max(
              startMs + DAY_MS,
              parseDateMs(endIso, startMs + 3 * DAY_MS)
            );

            const leftPct = toPercent(startMs);
            const widthPct = Math.max(3, toPercent(endMs) - leftPct);

            return (
              <div
                key={stage.id}
                onClick={() => !readOnly && onSelectStage?.(feature, stage)}
                className={`grid grid-cols-12 items-center transition ${
                  !readOnly ? "hover:bg-slate-900/60 cursor-pointer" : ""
                } ${isCurrent ? "bg-sky-950/15" : ""}`}
              >
                <div className="col-span-4 sm:col-span-3 px-4 py-3 border-r border-slate-800/80 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] font-mono text-slate-500">
                      {idx + 1}.
                    </span>
                    <span
                      className={`text-xs font-medium truncate ${
                        isCurrent
                          ? "text-sky-300 font-semibold"
                          : isCompleted
                          ? "text-slate-200"
                          : "text-slate-400"
                      }`}
                    >
                      {stage.name}
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-500 truncate pl-4 mt-0.5">
                    {stage.owner || feature.currentOwner}
                  </div>
                </div>

                <div className="col-span-8 sm:col-span-9 relative h-14 flex items-center">
                  {/* Vertical Grid Lines */}
                  {ticks.map((t, i) => (
                    <div
                      key={i}
                      style={{ left: `${t.pct}%` }}
                      className="absolute top-0 bottom-0 border-l border-slate-900 pointer-events-none"
                    />
                  ))}

                  {/* Today Line */}
                  <div
                    style={{ left: `${todayPct}%` }}
                    className="absolute top-0 bottom-0 border-l border-dashed border-sky-500/40 pointer-events-none z-10"
                    title={`Today (${todayIso})`}
                  />

                  {/* Target Date ("Want Done") Line */}
                  {targetPct !== null && (
                    <div
                      style={{ left: `${targetPct}%` }}
                      className="absolute top-0 bottom-0 border-l-2 border-violet-500/50 pointer-events-none z-10"
                      title={`Target Date — Want Done (${feature.targetDate})`}
                    />
                  )}

                  {/* Expected Date ("Expect Done") Line */}
                  {expectedPct !== null && (
                    <div
                      style={{ left: `${expectedPct}%` }}
                      className="absolute top-0 bottom-0 border-l-2 border-amber-500/60 pointer-events-none z-10"
                      title={`Expected Date — Expect Done (${feature.expectedDate})`}
                    />
                  )}

                  {/* Gantt Duration Bar */}
                  <div
                    style={{ left: `${leftPct}%`, width: `${widthPct}%` }}
                    className={`relative z-20 h-7 rounded-md px-2.5 flex items-center justify-between gap-2 text-[11px] font-medium shadow-sm transition ${
                      isCurrent
                        ? "bg-sky-500 text-slate-950 font-semibold ring-2 ring-sky-400/50"
                        : isCompleted
                        ? "bg-emerald-500/80 text-slate-950"
                        : "bg-slate-800 text-slate-300 border border-slate-700"
                    }`}
                  >
                    <span className="truncate">
                      {stage.name}
                    </span>
                    <span className="font-mono text-[10px] opacity-80 shrink-0 hidden md:inline">
                      {startIso ? startIso.slice(5) : ""}
                      {endIso ? `→${endIso.slice(5)}` : ""}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Stage Instructions & Proactive Agent Trigger Footer */}
      {!readOnly && (
        <div className="mt-3 px-4 py-2.5 rounded-lg bg-slate-900/70 border border-slate-800/90 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs text-slate-400">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-sky-400 shrink-0" />
            <span>
              <strong className="text-slate-200">Proactive Agent Skill Trigger:</strong>{" "}
              {feature.stages.find((s) => s.id === feature.currentStageId)
                ?.proactiveTrigger ||
                "Agent will ask 'Would you like to update the KAZOR flowchart?' when the current milestone finishes."}
            </span>
          </div>
          <span className="text-[11px] font-mono text-slate-500 shrink-0">
            Click any bar to edit dates or attach links
          </span>
        </div>
      )}
    </div>
  );
}
