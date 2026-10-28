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
        return <FileCode2 className="w-3.5 h-3.5 text-purple-600" />;
      case "github":
        return <GitPullRequest className="w-3.5 h-3.5 text-sky-600" />;
      case "preview_url":
        return <Globe className="w-3.5 h-3.5 text-emerald-600" />;
      case "trello":
        return <Trello className="w-3.5 h-3.5 text-amber-600" />;
      default:
        return <Link2 className="w-3.5 h-3.5 text-slate-500" />;
    }
  };

  return (
    <a
      href={link.url}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-slate-100 hover:bg-slate-200/80 border border-slate-200 text-xs text-slate-800 transition group shadow-xs"
      title={`Added by ${link.createdBy || "Agent"} • ${link.url}`}
    >
      {getIcon()}
      <span className="truncate max-w-[180px] font-medium">{link.label}</span>
      <ExternalLink className="w-3 h-3 text-slate-400 group-hover:text-indigo-600 transition" />
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
      <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200 whitespace-nowrap">
        <AlertTriangle className="w-3.5 h-3.5 text-rose-500 shrink-0" />
        <span>+{scheduleVarianceDays}d Slipping</span>
      </span>
    );
  }
  if (scheduleHealth === "early" && scheduleVarianceDays !== null) {
    return (
      <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-xs font-semibold bg-teal-50 text-teal-700 border border-teal-200 whitespace-nowrap">
        <span>{Math.abs(scheduleVarianceDays)}d Ahead</span>
      </span>
    );
  }
  if (scheduleHealth === "on_track") {
    return (
      <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 whitespace-nowrap">
        <span>On Track</span>
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-xs font-medium bg-slate-100 text-slate-600 border border-slate-200 whitespace-nowrap">
      <span>TBD</span>
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
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 p-4 bg-slate-50/70 border-b border-slate-200/80">
      {/* STAGE */}
      <div className="bg-white border border-slate-200/90 rounded-xl p-3.5 shadow-xs flex flex-col justify-between">
        <div className="flex items-center justify-between text-[11px] font-mono uppercase tracking-wider text-slate-500 mb-1">
          <span>Stage</span>
          <span className="text-indigo-600 font-semibold">
            {q.where.stageIndex + 1}/{q.where.totalStages} ({q.where.percentComplete}%)
          </span>
        </div>
        <div className="flex items-center justify-between gap-2 mt-1">
          <div className="flex items-center gap-2 min-w-0">
            <span className="w-2.5 h-2.5 rounded-full bg-indigo-600 animate-pulse shrink-0" />
            <span className="text-sm font-bold text-slate-900 truncate">
              {q.where.stageName}
            </span>
          </div>
          {!readOnly && onQuickAdvance && q.where.stageIndex + 1 < q.where.totalStages && (
            <button
              onClick={() => onQuickAdvance(feature)}
              className="px-2.5 py-1 rounded-lg bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 text-indigo-700 text-xs font-semibold inline-flex items-center gap-1 shrink-0 transition shadow-2xs"
              title="Advance to next stage in 1 click"
            >
              Advance <ArrowRight className="w-3 h-3" />
            </button>
          )}
        </div>
      </div>

      {/* CURRENT OWNER */}
      <div className="bg-white border border-slate-200/90 rounded-xl p-3.5 shadow-xs flex flex-col justify-between">
        <div className="flex items-center justify-between text-[11px] font-mono uppercase tracking-wider text-slate-500 mb-1">
          <span>Current Owner</span>
          <User className="w-3.5 h-3.5 text-purple-600" />
        </div>
        <div className="flex items-center justify-between gap-2 mt-1">
          <span className="text-sm font-semibold text-slate-800 truncate">
            {q.who}
          </span>
          {!readOnly && onOpenEditModal && (
            <button
              onClick={() => onOpenEditModal(feature)}
              className="text-[11px] text-indigo-600 hover:text-indigo-800 font-medium underline shrink-0"
            >
              Edit
            </button>
          )}
        </div>
      </div>

      {/* TARGET */}
      <div className="bg-white border border-slate-200/90 rounded-xl p-3.5 shadow-xs flex flex-col justify-between">
        <div className="flex items-center justify-between text-[11px] font-mono uppercase tracking-wider text-slate-500 mb-1">
          <span>Target</span>
          <Calendar className="w-3.5 h-3.5 text-slate-400" />
        </div>
        <div className="flex items-center justify-between gap-2 mt-1">
          <span className="text-sm font-mono font-bold text-slate-900">
            {q.whenWantDone || "Not set"}
          </span>
          <span className="text-[11px] text-slate-500 font-medium">Target Deadline</span>
        </div>
      </div>

      {/* PROJECTED */}
      <div className="bg-white border border-slate-200/90 rounded-xl p-3.5 shadow-xs flex flex-col justify-between">
        <div className="flex items-center justify-between text-[11px] font-mono uppercase tracking-wider text-slate-500 mb-1">
          <span>Projected</span>
          <ScheduleHealthBadge feature={feature} />
        </div>
        <div className="flex items-center justify-between gap-2 mt-1">
          <span className="text-sm font-mono font-bold text-slate-900">
            {q.whenExpectDone || "Not set"}
          </span>
          {!readOnly && onOpenEditModal && (
            <button
              onClick={() => onOpenEditModal(feature)}
              className="text-[11px] text-indigo-600 hover:text-indigo-800 font-medium underline shrink-0"
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
    <div className="p-5 overflow-x-auto bg-slate-50/40">
      <div className="flex items-stretch gap-3 min-w-max">
        {feature.stages.map((stage, index) => {
          const isCompleted = stage.status === "completed";
          const isCurrent =
            stage.id === feature.currentStageId || stage.status === "in_progress";

          return (
            <React.Fragment key={stage.id}>
              <div
                onClick={() => !readOnly && onSelectStage?.(feature, stage)}
                className={`w-64 rounded-xl p-4 border transition flex flex-col justify-between relative shadow-xs ${
                  !readOnly ? "cursor-pointer" : ""
                } ${
                  isCurrent
                    ? "bg-indigo-50/90 border-2 border-indigo-500 shadow-md shadow-indigo-500/10 ring-2 ring-indigo-200"
                    : isCompleted
                    ? "bg-emerald-50/70 border border-emerald-300 hover:border-emerald-400"
                    : "bg-white border border-slate-200 hover:border-slate-300"
                }`}
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <span className="text-[11px] font-mono text-slate-500 font-medium">
                      STAGE {index + 1}
                    </span>
                    {isCompleted ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200">
                        <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Done
                      </span>
                    ) : isCurrent ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-indigo-100 text-indigo-800 border border-indigo-300 shadow-2xs">
                        <CircleDot className="w-3 h-3 animate-spin text-indigo-600" /> Active Now
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium text-slate-500 bg-slate-100">
                        <Clock className="w-3 h-3 text-slate-400" /> Pending
                      </span>
                    )}
                  </div>

                  <h4 className="font-bold text-sm text-slate-900 mb-1">
                    {stage.name}
                  </h4>

                  <div className="text-xs text-slate-600 flex items-center gap-1.5 mb-2 font-medium">
                    <User className="w-3 h-3 text-slate-400 shrink-0" />
                    <span className="truncate">
                      {stage.owner || feature.currentOwner}
                    </span>
                  </div>

                  {stage.notes && (
                    <p className="text-xs text-slate-700 bg-slate-50 border border-slate-200 rounded-md p-2 mb-2 line-clamp-3">
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

                <div className="mt-3 pt-2.5 border-t border-slate-200/80 flex items-center justify-between text-[11px] font-mono text-slate-500">
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
                      isCompleted ? "bg-emerald-400" : "bg-slate-200"
                    }`}
                  />
                  <ArrowRight
                    className={`w-4 h-4 -ml-1 ${
                      isCompleted ? "text-emerald-500" : "text-slate-300"
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
    <div className="p-5 bg-white">
      {/* Legend & Key Date Markers */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4 text-xs">
        <div className="flex flex-wrap items-center gap-4 text-slate-600 font-medium">
          <span className="inline-flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-sm bg-emerald-500 inline-block shadow-2xs" />
            Completed Stage
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-sm bg-indigo-600 inline-block shadow-2xs" />
            Active Stage ("Where")
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-sm bg-slate-200 border border-slate-300 inline-block" />
            Planned / Upcoming
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-4 font-mono text-[11px] font-semibold">
          {feature.targetDate && (
            <span className="inline-flex items-center gap-1.5 text-purple-700 bg-purple-50 px-2 py-0.5 rounded border border-purple-200">
              <span className="w-2 h-3 bg-purple-600 inline-block rounded-sm" />
              Want Done: {feature.targetDate}
            </span>
          )}
          {feature.expectedDate && (
            <span className="inline-flex items-center gap-1.5 text-amber-800 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
              <span className="w-2 h-3 bg-amber-500 inline-block rounded-sm" />
              Expect Done: {feature.expectedDate}
            </span>
          )}
        </div>
      </div>

      {/* Gantt Chart Grid */}
      <div className="border border-slate-200 rounded-xl overflow-hidden bg-white shadow-xs">
        {/* Timeline Header */}
        <div className="grid grid-cols-12 border-b border-slate-200 bg-slate-50 text-[11px] font-mono text-slate-600">
          <div className="col-span-4 sm:col-span-3 px-4 py-2.5 border-r border-slate-200 font-bold text-slate-700">
            STAGE / OWNER
          </div>
          <div className="col-span-8 sm:col-span-9 relative h-9">
            {ticks.map((t, i) => (
              <div
                key={i}
                style={{ left: `${t.pct}%` }}
                className="absolute top-0 bottom-0 border-l border-slate-200 pl-1.5 pt-2 text-[10px] text-slate-500 font-medium select-none"
              >
                {t.label}
              </div>
            ))}
          </div>
        </div>

        {/* Stage Rows */}
        <div className="divide-y divide-slate-200/80 relative">
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
                  !readOnly ? "hover:bg-slate-50/80 cursor-pointer" : ""
                } ${isCurrent ? "bg-indigo-50/40" : ""}`}
              >
                <div className="col-span-4 sm:col-span-3 px-4 py-3 border-r border-slate-200 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] font-mono text-slate-400 font-medium">
                      {idx + 1}.
                    </span>
                    <span
                      className={`text-xs truncate ${
                        isCurrent
                          ? "text-indigo-800 font-bold"
                          : isCompleted
                          ? "text-slate-800 font-medium"
                          : "text-slate-500 font-normal"
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
                      className="absolute top-0 bottom-0 border-l border-slate-100 pointer-events-none"
                    />
                  ))}

                  {/* Today Line */}
                  <div
                    style={{ left: `${todayPct}%` }}
                    className="absolute top-0 bottom-0 border-l-2 border-dashed border-indigo-400 pointer-events-none z-10"
                    title={`Today (${todayIso})`}
                  />

                  {/* Target Date ("Want Done") Line */}
                  {targetPct !== null && (
                    <div
                      style={{ left: `${targetPct}%` }}
                      className="absolute top-0 bottom-0 border-l-2 border-purple-500 pointer-events-none z-10"
                      title={`Target Date — Want Done (${feature.targetDate})`}
                    />
                  )}

                  {/* Expected Date ("Expect Done") Line */}
                  {expectedPct !== null && (
                    <div
                      style={{ left: `${expectedPct}%` }}
                      className="absolute top-0 bottom-0 border-l-2 border-amber-500 pointer-events-none z-10"
                      title={`Expected Date — Expect Done (${feature.expectedDate})`}
                    />
                  )}

                  {/* Gantt Duration Bar */}
                  <div
                    style={{ left: `${leftPct}%`, width: `${widthPct}%` }}
                    className={`relative z-20 h-7 rounded-lg px-2.5 flex items-center justify-between gap-2 text-[11px] shadow-sm transition ${
                      isCurrent
                        ? "bg-gradient-to-r from-indigo-600 to-sky-600 text-white font-bold ring-2 ring-indigo-400/50 shadow-indigo-500/20"
                        : isCompleted
                        ? "bg-gradient-to-r from-emerald-600 to-teal-600 text-white font-medium"
                        : "bg-slate-100 text-slate-700 border border-slate-300 font-medium"
                    }`}
                  >
                    <span className="truncate">
                      {stage.name}
                    </span>
                    <span className="font-mono text-[10px] opacity-90 shrink-0 hidden md:inline">
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
        <div className="mt-3 px-4 py-2 rounded-lg bg-indigo-50/70 border border-indigo-100 flex items-center gap-2 text-xs text-slate-700">
          <Sparkles className="w-4 h-4 text-indigo-600 shrink-0" />
          <span>
            <strong className="text-indigo-950 font-semibold">Proactive Agent Trigger:</strong>{" "}
            {feature.stages.find((s) => s.id === feature.currentStageId)
              ?.proactiveTrigger ||
              "Agent will ask 'Would you like to update the KEYZOR flowchart?' when the current milestone finishes."}
          </span>
        </div>
      )}
    </div>
  );
}
