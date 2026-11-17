"use client";

import React, { useState } from "react";
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
  ArrowLeft,
  Sparkles,
} from "lucide-react";

export function formatDisplayDate(dateStr?: string | null): string {
  if (!dateStr || !dateStr.trim()) return "—";
  const trimmed = dateStr.trim();
  const isoMatch = trimmed.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})/);
  if (isoMatch) {
    const year = parseInt(isoMatch[1], 10);
    const month = parseInt(isoMatch[2], 10) - 1;
    const day = parseInt(isoMatch[3], 10);
    const d = new Date(year, month, day);
    if (!isNaN(d.getTime())) {
      return d.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      });
    }
  }
  return trimmed;
}

export function formatShortDate(dateStr?: string | null): string {
  if (!dateStr || !dateStr.trim()) return "—";
  const trimmed = dateStr.trim();
  const isoMatch = trimmed.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})/);
  if (isoMatch) {
    const year = parseInt(isoMatch[1], 10);
    const month = parseInt(isoMatch[2], 10) - 1;
    const day = parseInt(isoMatch[3], 10);
    const d = new Date(year, month, day);
    if (!isNaN(d.getTime())) {
      return d.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
      });
    }
  }
  return trimmed;
}

export function getStageProgressDotClass(stageIndex: number, totalStages: number): string {
  if (totalStages <= 1) return "bg-emerald-500";
  const ratio = stageIndex / Math.max(1, totalStages - 1);
  if (ratio <= 0) return "bg-slate-400";
  if (ratio <= 0.35) return "bg-sky-500";
  if (ratio <= 0.7) return "bg-purple-600";
  if (ratio < 1) return "bg-amber-500";
  return "bg-emerald-500";
}

function dedupLinks<T extends { url: string }>(links: T[]): T[] {
  const seen = new Set<string>();
  return links.filter((l) => {
    const key = (l.url || "").trim().toLowerCase().replace(/\/+$/, "");
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

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
  onQuickReturn,
  onOpenEditModal,
}: {
  feature: EnrichedFeature;
  readOnly?: boolean;
  onSelectStage?: (feature: EnrichedFeature, stage: EnrichedStage) => void;
  onQuickAdvance?: (feature: EnrichedFeature) => void;
  onQuickReturn?: (feature: EnrichedFeature) => void;
  onOpenEditModal?: (feature: EnrichedFeature) => void;
}) {
  const q = feature.fourQuestions;
  const dotColor = getStageProgressDotClass(q.where.stageIndex, q.where.totalStages);

  return (
    <div className="p-4 bg-slate-50/70 border-b border-slate-200/80">
      {/* Consolidated Single Metadata Strip (Item 2.5) */}
      <div className="bg-white border border-slate-200/90 rounded-xl shadow-xs overflow-hidden divide-y lg:divide-y-0 lg:divide-x divide-slate-200 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
        {/* STAGE */}
        <div className="p-3.5 flex flex-col justify-between">
          <div className="flex items-center justify-between text-[11px] font-mono uppercase tracking-wider text-slate-500 mb-1">
            <span>Stage</span>
            <span className="text-indigo-600 font-semibold">
              Stage {q.where.stageIndex + 1} of {q.where.totalStages} • {q.where.percentComplete}%
            </span>
          </div>
          <div className="flex items-center gap-2 mt-1 min-w-0">
            <span className={`w-2.5 h-2.5 rounded-full ${dotColor} shrink-0`} />
            <span className="text-sm font-bold text-slate-900 truncate">
              {q.where.stageName}
            </span>
          </div>
          {!readOnly && (onQuickAdvance || onQuickReturn) && (
            <div className="flex items-center gap-2 mt-2 pt-2 border-t border-slate-100 flex-wrap">
              {onQuickReturn && q.where.stageIndex > 0 && (
                <button
                  type="button"
                  onClick={() => onQuickReturn(feature)}
                  className="px-2.5 py-1 rounded-lg bg-white hover:bg-slate-50 border border-slate-300 text-slate-700 text-xs font-semibold inline-flex items-center gap-1 shrink-0 transition shadow-2xs hover:border-slate-400 hover:text-slate-900"
                  title="Return to previous stage"
                >
                  <ArrowLeft className="w-3 h-3" />
                  <span>Return to previous stage</span>
                </button>
              )}
              {onQuickAdvance && q.where.stageIndex + 1 < q.where.totalStages && (
                <button
                  type="button"
                  onClick={() => onQuickAdvance(feature)}
                  className="px-2.5 py-1 rounded-lg bg-white hover:bg-slate-50 border border-slate-300 text-slate-700 text-xs font-semibold inline-flex items-center gap-1 shrink-0 transition shadow-2xs hover:border-slate-400 hover:text-slate-900"
                  title="Advance to next stage"
                >
                  <span>Advance to next stage</span>
                  <ArrowRight className="w-3 h-3" />
                </button>
              )}
            </div>
          )}
        </div>

        {/* CURRENT OWNER */}
        <div className="p-3.5 flex flex-col justify-between">
          <div className="flex items-center justify-between text-[11px] font-mono uppercase tracking-wider text-slate-500 mb-1">
            <span>Current Owner</span>
            <User className="w-3.5 h-3.5 text-purple-600" />
          </div>
          <div className="flex items-center justify-between gap-2 mt-1">
            <span className="text-sm font-semibold text-slate-800 truncate" title={q.who}>
              {q.who}
            </span>
            {!readOnly && onOpenEditModal && (
              <button
                type="button"
                onClick={() => onOpenEditModal(feature)}
                className="text-[11px] text-indigo-600 hover:text-indigo-800 font-medium underline shrink-0"
              >
                Edit
              </button>
            )}
          </div>
        </div>

        {/* TARGET */}
        <div className="p-3.5 flex flex-col justify-between">
          <div className="flex items-center justify-between text-[11px] font-mono uppercase tracking-wider text-slate-500 mb-1">
            <span>Target</span>
            <Calendar className="w-3.5 h-3.5 text-slate-400" />
          </div>
          <div className="flex items-center justify-between gap-2 mt-1">
            <span className="text-sm font-mono font-bold text-slate-900">
              {formatDisplayDate(q.whenWantDone)}
            </span>
            <span className="text-[11px] text-slate-500 font-medium">Target Deadline</span>
          </div>
        </div>

        {/* PROJECTED */}
        <div className="p-3.5 flex flex-col justify-between">
          <div className="flex items-center justify-between text-[11px] font-mono uppercase tracking-wider text-slate-500 mb-1">
            <span>Projected</span>
            <ScheduleHealthBadge feature={feature} />
          </div>
          <div className="flex items-center justify-between gap-2 mt-1">
            <span className="text-sm font-mono font-bold text-slate-900">
              {formatDisplayDate(q.whenExpectDone)}
            </span>
            {!readOnly && onOpenEditModal && (
              <button
                type="button"
                onClick={() => onOpenEditModal(feature)}
                className="text-[11px] text-indigo-600 hover:text-indigo-800 font-medium underline shrink-0"
              >
                Update Date
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function StageNotes({ notes }: { notes: string }) {
  const [expanded, setExpanded] = useState(false);
  const isLong = notes.length > 90;

  return (
    <div className="text-xs text-slate-600 mb-2 leading-relaxed">
      <p className={!expanded && isLong ? "line-clamp-3" : ""}>{notes}</p>
      {isLong && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            setExpanded(!expanded);
          }}
          className="text-[11px] text-indigo-600 hover:text-indigo-800 font-medium underline mt-0.5 inline-block"
        >
          {expanded ? "See Less" : "See More"}
        </button>
      )}
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

                  {stage.notes && <StageNotes notes={stage.notes} />}

                  {dedupLinks(stage.links).length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      {dedupLinks(stage.links).map((lnk) => (
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

                <div className="mt-3 pt-2.5 border-t border-slate-200/80 flex items-center justify-center gap-1.5 text-[11px] font-mono text-slate-500">
                  <Calendar className="w-3 h-3 text-slate-400 shrink-0" />
                  <span>
                    {formatShortDate(stage.actualStartDate || stage.plannedStartDate)}
                  </span>
                  <span>→</span>
                  <span>
                    {formatShortDate(stage.actualEndDate || stage.plannedEndDate)}
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
  const [zoom, setZoom] = useState<"day" | "week" | "month">("week");
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

  // Generate tick labels based on zoom
  const ticks: Array<{ label: string; pct: number }> = [];
  const stepDays =
    zoom === "day"
      ? 1
      : zoom === "month"
      ? Math.max(14, Math.round(totalDays / 6))
      : Math.max(3, Math.round(totalDays / 8));

  for (let d = 0; d <= totalDays; d += stepDays) {
    const tickMs = minMs + d * DAY_MS;
    const iso = new Date(tickMs).toISOString().slice(0, 10);
    ticks.push({ label: formatShortDate(iso), pct: toPercent(tickMs) });
  }

  return (
    <div className="p-5 bg-white">
      {/* Legend, Timeline Markers & Zoom Controls (Items 3.1 & 3.6) */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4 text-xs">
        <div className="flex flex-wrap items-center gap-4 text-slate-600 font-medium">
          <span className="inline-flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-sm bg-emerald-500 inline-block shadow-2xs" />
            Done
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-sm bg-indigo-600 inline-block shadow-2xs" />
            Active Now
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-sm bg-slate-200 border border-slate-300 inline-block" />
            Pending
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Zoom Controls */}
          <div className="inline-flex rounded-lg bg-slate-100 p-0.5 border border-slate-200 text-xs font-medium">
            {(["day", "week", "month"] as const).map((mode) => (
              <button
                key={mode}
                type="button"
                onClick={() => setZoom(mode)}
                className={`px-2.5 py-0.5 rounded-md capitalize transition text-[11px] ${
                  zoom === mode
                    ? "bg-white text-slate-900 font-semibold shadow-2xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                {mode}
              </button>
            ))}
          </div>

          <div className="flex flex-wrap items-center gap-2 font-mono text-[11px] font-semibold">
            {feature.targetDate && (
              <span className="inline-flex items-center gap-1.5 text-purple-700 bg-purple-50 px-2 py-0.5 rounded border border-purple-200">
                <span className="w-2 h-3 bg-purple-600 inline-block rounded-sm" />
                Target: {formatDisplayDate(feature.targetDate)}
              </span>
            )}
            {feature.expectedDate && (
              <span className="inline-flex items-center gap-1.5 text-amber-800 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                <span className="w-2 h-3 bg-amber-500 inline-block rounded-sm" />
                Projected: {formatDisplayDate(feature.expectedDate)}
              </span>
            )}
          </div>
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
                className="absolute top-0 bottom-0 border-l border-slate-200 pl-1 pt-2 text-[10px] text-slate-500 font-medium select-none truncate"
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

            const durationDays = Math.max(1, Math.round((endMs - startMs) / DAY_MS));
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
                {/* Flushed Left Typography (Item 3.4) */}
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
                  <div
                    className="text-[11px] text-slate-500 truncate mt-0.5"
                    title={stage.owner || feature.currentOwner}
                  >
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

                  {/* Today Line with Badge (Item 3.5) */}
                  <div
                    style={{ left: `${todayPct}%` }}
                    className="absolute top-0 bottom-0 border-l-2 border-dashed border-indigo-500 pointer-events-none z-10"
                    title={`Today (${formatDisplayDate(todayIso)})`}
                  >
                    <span className="absolute -top-3 left-1 px-1.5 py-0.5 rounded bg-indigo-600 text-white font-mono text-[9px] font-bold shadow-2xs whitespace-nowrap">
                      Today: {formatShortDate(todayIso)}
                    </span>
                  </div>

                  {/* Target Date ("Target") Line */}
                  {targetPct !== null && (
                    <div
                      style={{ left: `${targetPct}%` }}
                      className="absolute top-0 bottom-0 border-l-2 border-purple-500 pointer-events-none z-10"
                      title={`Target (${formatDisplayDate(feature.targetDate)})`}
                    />
                  )}

                  {/* Projected Date ("Projected") Line */}
                  {expectedPct !== null && (
                    <div
                      style={{ left: `${expectedPct}%` }}
                      className="absolute top-0 bottom-0 border-l-2 border-amber-500 pointer-events-none z-10"
                      title={`Projected (${formatDisplayDate(feature.expectedDate)})`}
                    />
                  )}

                  {/* Gantt Duration Bar (Items 3.2 & 3.3: solid color, no embedded text, hover tooltip) */}
                  <div
                    style={{ left: `${leftPct}%`, width: `${widthPct}%` }}
                    title={`${stage.name} • ${formatShortDate(startIso)} → ${formatShortDate(endIso)} (${durationDays}d) • ${
                      isCompleted ? "Done" : isCurrent ? "Active Now" : "Pending"
                    }`}
                    className={`relative z-20 h-7 rounded-lg px-2 flex items-center justify-center text-[11px] shadow-xs transition group cursor-help ${
                      isCurrent
                        ? "bg-indigo-600 text-white font-bold ring-2 ring-indigo-400/50 shadow-indigo-500/20"
                        : isCompleted
                        ? "bg-emerald-500 text-white font-medium"
                        : "bg-slate-200 text-slate-700 border border-slate-300 font-medium"
                    }`}
                  >
                    {/* Hover Tooltip Card */}
                    <div className="hidden group-hover:block absolute bottom-full mb-1 left-1/2 -translate-x-1/2 px-2.5 py-1 bg-slate-900 text-white text-xs rounded-md shadow-lg whitespace-nowrap z-50 pointer-events-none">
                      <div className="font-semibold">{stage.name}</div>
                      <div className="text-[10px] text-slate-300">
                        {formatShortDate(startIso)} → {formatShortDate(endIso)} ({durationDays}d) •{" "}
                        {isCompleted ? "Done" : isCurrent ? "Active Now" : "Pending"}
                      </div>
                    </div>
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
