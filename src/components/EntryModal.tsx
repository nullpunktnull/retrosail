"use client";

import { useEffect, useRef, useState } from "react";
import { createEntry, deleteEntry, updateEntry } from "@/lib/actions";
import {
  getOrCreateIdentity,
  getStoredName,
  setStoredName,
  type EntryDTO,
  type EntryType,
} from "@/lib/identity";
import { ConfirmDialog } from "./ConfirmDialog";

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
  ROCK: "Felsen — welche Gefahren es gibt",
};

/** Compact set for retros — wind / blockers / mood / team. */
const QUICK_EMOJIS = [
  "⛵",
  "💨",
  "🌊",
  "🏝️",
  "⚓",
  "🪨",
  "🔥",
  "💡",
  "✅",
  "❌",
  "⚠️",
  "🚧",
  "🐢",
  "🚀",
  "💪",
  "🙌",
  "👍",
  "👎",
  "❤️",
  "😂",
  "🤔",
  "😅",
  "😤",
  "🎯",
  "⏱️",
] as const;

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
  const [emojiOpen, setEmojiOpen] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const emojiWrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!mode) return;
    setError("");
    setEmojiOpen(false);
    setConfirmDelete(false);
    setName(mode.kind === "edit" ? mode.entry.authorName : getStoredName());
    setContent(mode.kind === "edit" ? mode.entry.content : "");
  }, [mode]);

  useEffect(() => {
    if (!emojiOpen) return;
    function onPointerDown(e: MouseEvent) {
      if (
        emojiWrapRef.current &&
        !emojiWrapRef.current.contains(e.target as Node)
      ) {
        setEmojiOpen(false);
      }
    }
    document.addEventListener("mousedown", onPointerDown);
    return () => document.removeEventListener("mousedown", onPointerDown);
  }, [emojiOpen]);

  if (!mode) return null;

  const type = mode.kind === "create" ? mode.type : mode.entry.type;
  const title =
    mode.kind === "create" ? "Eintrag hinzufügen" : "Eintrag bearbeiten";

  function insertAtCursor(snippet: string) {
    const el = textareaRef.current;
    if (!el) {
      setContent((c) => c + snippet);
      return;
    }
    const start = el.selectionStart;
    const end = el.selectionEnd;
    const next = content.slice(0, start) + snippet + content.slice(end);
    setContent(next);
    requestAnimationFrame(() => {
      el.focus();
      const pos = start + snippet.length;
      el.setSelectionRange(pos, pos);
    });
  }

  function wrapBold() {
    const el = textareaRef.current;
    const start = el?.selectionStart ?? content.length;
    const end = el?.selectionEnd ?? content.length;
    const selected = content.slice(start, end);
    const inner = selected || "fett";
    const snippet = `**${inner}**`;
    const next = content.slice(0, start) + snippet + content.slice(end);
    setContent(next);
    requestAnimationFrame(() => {
      if (!el) return;
      el.focus();
      if (selected) {
        const pos = start + snippet.length;
        el.setSelectionRange(pos, pos);
      } else {
        el.setSelectionRange(start + 2, start + 2 + inner.length);
      }
    });
  }

  function insertEmoji(emoji: string) {
    insertAtCursor(emoji);
    setEmojiOpen(false);
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
    setBusy(true);
    const identity = getOrCreateIdentity();
    const result = await deleteEntry({
      entryId: mode!.entry.id,
      identityToken: identity,
    });
    setBusy(false);
    if (!result.ok) {
      setError(result.error);
      setConfirmDelete(false);
      return;
    }
    onDeleted(mode!.entry.id);
    onClose();
  }

  return (
    <div className="fixed inset-0 z-[120] flex items-end justify-center bg-black/40 p-3 sm:items-center">
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
            <span className="flex items-center gap-0.5">
              <button
                type="button"
                onClick={wrapBold}
                className="rounded px-1.5 py-0.5 font-semibold text-[var(--ink)] hover:bg-black/5"
                title="Auswahl fett machen (**text**)"
              >
                B
              </button>
              <div className="relative" ref={emojiWrapRef}>
                <button
                  type="button"
                  onClick={() => setEmojiOpen((v) => !v)}
                  className="rounded px-1.5 py-0.5 text-[var(--ink)] hover:bg-black/5"
                  title="Emoji einfügen"
                  aria-expanded={emojiOpen}
                >
                  ☺
                </button>
                {emojiOpen && (
                  <div className="absolute top-full right-0 z-10 mt-1 w-[15.5rem] rounded-xl border border-[var(--line)] bg-[var(--foam)] p-2 shadow-lg">
                    <div className="grid grid-cols-5 gap-0.5">
                      {QUICK_EMOJIS.map((emoji) => (
                        <button
                          key={emoji}
                          type="button"
                          onClick={() => insertEmoji(emoji)}
                          className="flex h-9 items-center justify-center rounded-lg text-lg hover:bg-black/5"
                        >
                          {emoji}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </span>
          </span>
          <textarea
            ref={textareaRef}
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
              onClick={() => setConfirmDelete(true)}
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

      <ConfirmDialog
        open={confirmDelete}
        title="Eintrag löschen?"
        body="Dieser Kommentar wird unwiderruflich entfernt."
        confirmLabel="Löschen"
        busy={busy}
        onCancel={() => {
          if (!busy) setConfirmDelete(false);
        }}
        onConfirm={handleDelete}
      />
    </div>
  );
}
