"use client";

import React, { useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import {
  ArrowLeft,
  Check,
  Code2,
  Copy,
  Download,
  Eye,
  FileText,
  Sparkles,
} from "lucide-react";
import type { FeatureDocumentRecord } from "@/lib/services/lifecycle-service";

export function MarkdownDocViewer({
  doc,
  featureTitle,
  backHref,
}: {
  doc: FeatureDocumentRecord;
  featureTitle?: string;
  backHref?: string;
}) {
  const [viewMode, setViewMode] = useState<"rendered" | "raw">("rendered");
  const [copiedMd, setCopiedMd] = useState(false);
  const [copiedApiUrl, setCopiedApiUrl] = useState(false);

  const handleCopyMarkdown = async () => {
    try {
      await navigator.clipboard.writeText(doc.content);
      setCopiedMd(true);
      setTimeout(() => setCopiedMd(false), 2000);
    } catch {
      // ignore clipboard errors
    }
  };

  const handleCopyApiUrl = async () => {
    try {
      const origin =
        typeof window !== "undefined" ? window.location.origin : "";
      await navigator.clipboard.writeText(`${origin}/api/v1/docs/${doc.id}`);
      setCopiedApiUrl(true);
      setTimeout(() => setCopiedApiUrl(false), 2000);
    } catch {
      // ignore clipboard errors
    }
  };

  const handleDownload = () => {
    const blob = new Blob([doc.content], { type: "text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = doc.filename.endsWith(".md") ? doc.filename : `${doc.filename}.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const formattedSize =
    doc.sizeBytes < 1024
      ? `${doc.sizeBytes} B`
      : `${(doc.sizeBytes / 1024).toFixed(1)} KB`;

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <header className="sticky top-0 z-20 bg-white/95 backdrop-blur border-b border-slate-200">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-3 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            {backHref ? (
              <a
                href={backHref}
                className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-xs font-medium text-slate-700 transition"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                Back
              </a>
            ) : (
              <button
                type="button"
                onClick={() => window.history.back()}
                className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-xs font-medium text-slate-700 transition"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                Back
              </button>
            )}

            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <FileText className="w-4 h-4 text-purple-600 shrink-0" />
                <h1 className="text-sm sm:text-base font-bold text-slate-900 truncate">
                  {doc.title}
                </h1>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-purple-50 border border-purple-200 text-[11px] font-semibold text-purple-700">
                  <Sparkles className="w-3 h-3" />
                  Hosted Markdown
                </span>
                <span className="px-2 py-0.5 rounded bg-slate-100 border border-slate-200 text-[11px] font-mono text-slate-600">
                  {doc.filename}
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5 truncate">
                {featureTitle ? `${featureTitle} · ` : ""}
                Updated by <span className="font-medium text-slate-700">{doc.updatedBy}</span> ·{" "}
                {new Date(doc.updatedAt).toLocaleString()} · {formattedSize}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <div className="inline-flex rounded-lg border border-slate-200 bg-slate-100 p-0.5">
              <button
                type="button"
                onClick={() => setViewMode("rendered")}
                className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium transition ${
                  viewMode === "rendered"
                    ? "bg-white text-slate-900 shadow-xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                <Eye className="w-3.5 h-3.5" />
                Rendered
              </button>
              <button
                type="button"
                onClick={() => setViewMode("raw")}
                className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium transition ${
                  viewMode === "raw"
                    ? "bg-white text-slate-900 shadow-xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                <Code2 className="w-3.5 h-3.5" />
                Raw
              </button>
            </div>

            <button
              type="button"
              onClick={handleCopyApiUrl}
              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-xs font-medium text-slate-700 transition"
              title="Copy raw API URL for agent-to-agent sharing"
            >
              {copiedApiUrl ? (
                <Check className="w-3.5 h-3.5 text-emerald-600" />
              ) : (
                <Copy className="w-3.5 h-3.5 text-slate-500" />
              )}
              {copiedApiUrl ? "Copied API URL" : "Agent API URL"}
            </button>

            <button
              type="button"
              onClick={handleCopyMarkdown}
              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-xs font-medium text-slate-700 transition"
            >
              {copiedMd ? (
                <Check className="w-3.5 h-3.5 text-emerald-600" />
              ) : (
                <Copy className="w-3.5 h-3.5 text-slate-500" />
              )}
              {copiedMd ? "Copied" : "Copy .md"}
            </button>

            <button
              type="button"
              onClick={handleDownload}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-xs font-semibold text-white transition shadow-xs"
            >
              <Download className="w-3.5 h-3.5" />
              Download
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-8">
        <div className="bg-white border border-slate-200 rounded-2xl shadow-xs p-6 sm:p-10">
          {viewMode === "raw" ? (
            <pre className="whitespace-pre-wrap break-words font-mono text-xs sm:text-sm text-slate-800 bg-slate-50 border border-slate-200 rounded-xl p-4 overflow-x-auto leading-relaxed">
              {doc.content}
            </pre>
          ) : (
            <article className="space-y-4 text-slate-800 leading-relaxed">
              <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                components={{
                  h1: ({ children }) => (
                    <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 border-b border-slate-200 pb-2 mt-2 mb-4">
                      {children}
                    </h1>
                  ),
                  h2: ({ children }) => (
                    <h2 className="text-xl font-bold text-slate-900 border-b border-slate-100 pb-1.5 mt-7 mb-3">
                      {children}
                    </h2>
                  ),
                  h3: ({ children }) => (
                    <h3 className="text-base sm:text-lg font-semibold text-slate-900 mt-5 mb-2">
                      {children}
                    </h3>
                  ),
                  p: ({ children }) => (
                    <p className="text-sm sm:text-[15px] text-slate-700 leading-relaxed my-3">
                      {children}
                    </p>
                  ),
                  ul: ({ children }) => (
                    <ul className="list-disc pl-6 space-y-1.5 text-sm sm:text-[15px] text-slate-700 my-3">
                      {children}
                    </ul>
                  ),
                  ol: ({ children }) => (
                    <ol className="list-decimal pl-6 space-y-1.5 text-sm sm:text-[15px] text-slate-700 my-3">
                      {children}
                    </ol>
                  ),
                  blockquote: ({ children }) => (
                    <blockquote className="border-l-4 border-indigo-400 bg-indigo-50/50 pl-4 py-2 pr-3 rounded-r-lg text-slate-700 italic my-4">
                      {children}
                    </blockquote>
                  ),
                  code: ({ className, children, ...props }) => {
                    const isBlock = Boolean(className);
                    if (isBlock) {
                      return (
                        <code
                          className={`block bg-slate-900 text-slate-100 rounded-xl p-4 text-xs sm:text-sm font-mono overflow-x-auto my-4 ${className || ""}`}
                          {...props}
                        >
                          {children}
                        </code>
                      );
                    }
                    return (
                      <code
                        className="px-1.5 py-0.5 rounded bg-slate-100 border border-slate-200 text-indigo-700 font-mono text-[13px]"
                        {...props}
                      >
                        {children}
                      </code>
                    );
                  },
                  pre: ({ children }) => <pre className="my-4">{children}</pre>,
                  table: ({ children }) => (
                    <div className="overflow-x-auto my-4 border border-slate-200 rounded-xl">
                      <table className="min-w-full divide-y divide-slate-200 text-sm">
                        {children}
                      </table>
                    </div>
                  ),
                  thead: ({ children }) => (
                    <thead className="bg-slate-50 text-slate-700 font-semibold">
                      {children}
                    </thead>
                  ),
                  th: ({ children }) => (
                    <th className="px-4 py-2.5 text-left text-xs uppercase tracking-wider">
                      {children}
                    </th>
                  ),
                  td: ({ children }) => (
                    <td className="px-4 py-2.5 border-t border-slate-100 text-slate-700">
                      {children}
                    </td>
                  ),
                  a: ({ href, children }) => (
                    <a
                      href={href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-indigo-600 hover:text-indigo-800 underline underline-offset-2"
                    >
                      {children}
                    </a>
                  ),
                  hr: () => <hr className="border-slate-200 my-6" />,
                }}
              >
                {doc.content}
              </ReactMarkdown>
            </article>
          )}
        </div>
      </main>
    </div>
  );
}
