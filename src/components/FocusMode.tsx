"use client";

import { createPortal } from "react-dom";
import { useEffect } from "react";
import {
  canEditEntry,
  type EntryDTO,
  type EntryType,
  type SurveyDTO,
} from "@/lib/identity";
import { renderRichText } from "@/lib/rich-text";

const ZONE_META: Record<EntryType, { title: string }> = {
  WIND: { title: "Was treibt uns voran?" },
  ANCHOR: { title: "Was hält uns zurück?" },
  ROCK: { title: "Was macht das Ziel unmöglich?" },
};

type Props = {
  open: boolean;
  type: EntryType | null;
  survey: SurveyDTO;
  identity: string;
  onClose: () => void;
  onAdd: (type: EntryType) => void;
  onEdit: (entry: EntryDTO) => void;
};

/**
 * Feature 5 — Fokus-Modus: eine Zone gross für Moderation am Screen.
 */
export function FocusMode({
  open,
  type,
  survey,
  identity,
  onClose,
  onAdd,
  onEdit,
}: Props) {
  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open || !type || typeof document === "undefined") return null;

  const meta = ZONE_META[type];
  const entries = survey.entries.filter((e) => e.type === type);

  return createPortal(
    <div className="fixed inset-0 z-[90] flex flex-col bg-[color-mix(in_oklab,var(--deep)_55%,transparent)] p-4 backdrop-blur-sm sm:p-6">
      <div className="mx-auto flex h-full w-full max-w-3xl flex-col rounded-2xl border border-white/30 bg-[color-mix(in_oklab,var(--foam)_88%,transparent)] p-4 shadow-2xl backdrop-blur-md sm:p-6">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-[11px] font-semibold tracking-[0.14em] text-[var(--sea)] uppercase">
              Fokus
            </p>
            <h2 className="mt-1 font-[family-name:var(--font-display)] text-2xl text-[var(--ink)] sm:text-3xl">
              {meta.title}
            </h2>
          </div>
          <div className="flex shrink-0 gap-2">
            <button
              type="button"
              onClick={() => onAdd(type)}
              className="h-9 rounded-md bg-[var(--sea)] px-3 text-sm font-medium text-white hover:bg-[var(--sea-deep)]"
            >
              + Eintrag
            </button>
            <button
              type="button"
              onClick={onClose}
              className="h-9 rounded-md px-3 text-sm text-[var(--ink-muted)] hover:bg-black/5"
            >
              Schliessen
            </button>
          </div>
        </div>

        <div className="mt-4 min-h-0 flex-1 space-y-2 overflow-y-auto pr-1">
          {entries.length === 0 ? (
            <p className="rounded-xl border border-dashed border-[var(--line)] px-4 py-10 text-center text-sm text-[var(--ink-muted)]">
              Noch leer — sei der Erste.
            </p>
          ) : (
            entries.map((entry) => {
              const editable = canEditEntry(entry, survey, identity);
              return (
                <article
                  key={entry.id}
                  className={`rounded-xl border border-[var(--line)] bg-white/70 px-4 py-3 text-left shadow-sm ${editable ? "cursor-pointer hover:border-[var(--sea)]" : ""}`}
                  onClick={editable ? () => onEdit(entry) : undefined}
                  role={editable ? "button" : undefined}
                  tabIndex={editable ? 0 : undefined}
                  onKeyDown={
                    editable
                      ? (e) => {
                          if (e.key === "Enter" || e.key === " ") onEdit(entry);
                        }
                      : undefined
                  }
                >
                  <p className="text-base leading-snug text-[var(--ink)]">
                    {renderRichText(entry.content)}
                  </p>
                  <p className="mt-2 text-xs text-[var(--ink-faint)]">
                    {entry.authorName}
                  </p>
                </article>
              );
            })
          )}
        </div>
      </div>
    </div>,
    document.body,
  );
}
