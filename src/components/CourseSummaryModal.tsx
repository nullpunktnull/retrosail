"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { formatCourseSummary } from "@/lib/course-summary";
import type { SurveyDTO } from "@/lib/identity";

type Props = {
  open: boolean;
  survey: SurveyDTO;
  onClose: () => void;
};

/** Feature 1 — Modal: Zusammenfassung kopieren. */
export function CourseSummaryModal({ open, survey, onClose }: Props) {
  const [copied, setCopied] = useState(false);
  const markdown = formatCourseSummary(survey);

  useEffect(() => {
    if (!open) setCopied(false);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open || typeof document === "undefined") return null;

  async function copy() {
    try {
      await navigator.clipboard.writeText(markdown);
      setCopied(true);
    } catch {
      // fallback
      const ta = document.createElement("textarea");
      ta.value = markdown;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      document.body.removeChild(ta);
      setCopied(true);
    }
  }

  return createPortal(
    <div
      className="fixed inset-0 z-[100] flex items-end justify-center bg-black/40 p-3 sm:items-center sm:p-4"
      role="presentation"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="course-summary-title"
        className="flex max-h-[85vh] w-full max-w-lg flex-col rounded-2xl border border-[var(--line)] bg-[var(--foam)] p-5 shadow-2xl"
      >
        <h2
          id="course-summary-title"
          className="font-[family-name:var(--font-display)] text-2xl text-[var(--ink)]"
        >
          Zusammenfassung
        </h2>
        <p className="mt-1 text-sm text-[var(--ink-muted)]">
          Markdown zum Kopieren in Confluence, Slack oder Notizen.
        </p>
        <pre className="mt-4 min-h-0 flex-1 overflow-auto rounded-lg border border-[var(--line)] bg-white/80 p-3 text-xs leading-relaxed whitespace-pre-wrap text-[var(--ink)]">
          {markdown}
        </pre>
        <div className="mt-4 flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="h-9 rounded-md px-3 text-sm text-[var(--ink-muted)] hover:bg-black/5"
          >
            Schliessen
          </button>
          <button
            type="button"
            onClick={copy}
            className="h-9 rounded-md bg-[var(--sea)] px-4 text-sm font-medium text-white hover:bg-[var(--sea-deep)]"
          >
            {copied ? "Kopiert ✓" : "Kopieren"}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
