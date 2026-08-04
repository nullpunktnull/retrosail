"use client";

import { useEffect, useState } from "react";
import { createEntry, deleteEntry, updateEntry } from "@/lib/actions";
import {
  getOrCreateIdentity,
  getStoredName,
  setStoredName,
  type EntryDTO,
  type EntryType,
} from "@/lib/identity";

type Mode =
  | { kind: "create"; type: EntryType }
  | { kind: "edit"; entry: EntryDTO }
  | null;

type Props = {
  surveyId: string;
  mode: Mode;
  onClose: () => void;
  onSaved: (entry: EntryDTO) => void;
  onDeleted: (entryId: string) => void;
};

const TYPE_LABELS: Record<EntryType, string> = {
  WIND: "Wind — was hilft vorwärts",
  ANCHOR: "Anker — was bremst",
  ROCK: "Felsen — was das Ziel unmöglich macht",
};

export function EntryModal({
  surveyId,
  mode,
  onClose,
  onSaved,
  onDeleted,
}: Props) {
  const [name, setName] = useState("");
  const [content, setContent] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!mode) return;
    setError("");
    setName(mode.kind === "edit" ? mode.entry.authorName : getStoredName());
    setContent(mode.kind === "edit" ? mode.entry.content : "");
  }, [mode]);

  if (!mode) return null;

  const type = mode.kind === "create" ? mode.type : mode.entry.type;
  const title =
    mode.kind === "create" ? "Eintrag hinzufügen" : "Eintrag bearbeiten";

  function wrapBold() {
    const el = document.getElementById(
      "retrosail-content",
    ) as HTMLTextAreaElement | null;
    if (!el) {
      setContent((c) => `${c}**fett**`);
      return;
    }
    const start = el.selectionStart;
    const end = el.selectionEnd;
    const selected = content.slice(start, end) || "fett";
    const next =
      content.slice(0, start) + `**${selected}**` + content.slice(end);
    setContent(next);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    const identity = getOrCreateIdentity();
    setStoredName(name.trim());

    try {
      if (mode!.kind === "create") {
        const result = await createEntry({
          surveyId,
          type,
          authorName: name,
          authorToken: identity,
          content,
        });
        if (!result.ok) {
          setError(result.error);
          return;
        }
        onSaved(result.entry);
        onClose();
      } else {
        const result = await updateEntry({
          entryId: mode!.entry.id,
          identityToken: identity,
          authorName: name,
          content,
        });
        if (!result.ok) {
          setError(result.error);
          return;
        }
        onSaved(result.entry);
        onClose();
      }
    } finally {
      setBusy(false);
    }
  }

  async function handleDelete() {
    if (mode!.kind !== "edit") return;
    if (!confirm("Eintrag wirklich löschen?")) return;
    setBusy(true);
    const identity = getOrCreateIdentity();
    const result = await deleteEntry({
      entryId: mode!.entry.id,
      identityToken: identity,
    });
    setBusy(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    onDeleted(mode!.entry.id);
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-3 sm:items-center">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-md rounded-2xl border border-[var(--line)] bg-[var(--foam)] p-5 shadow-2xl"
      >
        <p className="text-[11px] font-semibold tracking-[0.14em] text-[var(--sea)] uppercase">
          {TYPE_LABELS[type]}
        </p>
        <h2 className="mt-1 font-[family-name:var(--font-display)] text-2xl text-[var(--ink)]">
          {title}
        </h2>

        <label className="mt-4 block">
          <span className="text-xs text-[var(--ink-muted)]">Name</span>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="mt-1 h-10 w-full rounded-lg border border-[var(--line)] bg-white/80 px-3 text-sm outline-none focus:border-[var(--sea)]"
            required
          />
        </label>

        <label className="mt-3 block">
          <span className="flex items-center justify-between text-xs text-[var(--ink-muted)]">
            Kommentar
            <button
              type="button"
              onClick={wrapBold}
              className="rounded px-1.5 py-0.5 font-semibold text-[var(--ink)] hover:bg-black/5"
              title="Auswahl fett machen (**text**)"
            >
              B
            </button>
          </span>
          <textarea
            id="retrosail-content"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            rows={4}
            placeholder="Text, Emojis ⛵ und **wichtige** Wörter…"
            className="mt-1 w-full rounded-lg border border-[var(--line)] bg-white/80 px-3 py-2 text-sm outline-none focus:border-[var(--sea)]"
            required
          />
        </label>

        {error && (
          <p className="mt-2 text-sm text-[var(--rock)]" role="alert">
            {error}
          </p>
        )}

        <div className="mt-4 flex items-center justify-between gap-2">
          {mode.kind === "edit" ? (
            <button
              type="button"
              onClick={handleDelete}
              disabled={busy}
              className="h-9 rounded-md px-3 text-sm text-[var(--rock)] hover:bg-[color-mix(in_oklab,var(--rock)_10%,transparent)]"
            >
              Löschen
            </button>
          ) : (
            <span />
          )}
          <div className="flex gap-2">
            <button
              type="button"
              onClick={onClose}
              className="h-9 rounded-md px-3 text-sm text-[var(--ink-muted)] hover:bg-black/5"
            >
              Abbrechen
            </button>
            <button
              type="submit"
              disabled={busy}
              className="h-9 rounded-md bg-[var(--sea)] px-4 text-sm font-medium text-white hover:bg-[var(--sea-deep)] disabled:opacity-60"
            >
              Speichern
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
