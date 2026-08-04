"use client";

import { createPortal } from "react-dom";
import { useEffect, useState } from "react";

type Props = {
  open: boolean;
  title: string;
  body: string;
  confirmLabel?: string;
  cancelLabel?: string;
  danger?: boolean;
  busy?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
};

export function ConfirmDialog({
  open,
  title,
  body,
  confirmLabel = "Löschen",
  cancelLabel = "Abbrechen",
  danger = true,
  busy = false,
  onConfirm,
  onCancel,
}: Props) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape" && !busy) onCancel();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, busy, onCancel]);

  if (!mounted || !open) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[110] flex items-end justify-center bg-black/40 p-3 sm:items-center sm:p-4"
      role="presentation"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget && !busy) onCancel();
      }}
    >
      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="retrosail-confirm-title"
        aria-describedby="retrosail-confirm-body"
        className="w-full max-w-md rounded-2xl border border-[var(--line)] bg-[var(--foam)] p-5 shadow-2xl"
      >
        <h2
          id="retrosail-confirm-title"
          className="font-[family-name:var(--font-display)] text-2xl text-[var(--ink)]"
        >
          {title}
        </h2>
        <p
          id="retrosail-confirm-body"
          className="mt-2 whitespace-pre-line text-sm leading-relaxed text-[var(--ink-muted)]"
        >
          {body}
        </p>
        <div className="mt-5 flex justify-end gap-2">
          <button
            type="button"
            disabled={busy}
            onClick={onCancel}
            className="h-9 rounded-md px-3 text-sm text-[var(--ink-muted)] hover:bg-black/5 disabled:opacity-60"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={onConfirm}
            className={`h-9 rounded-md px-4 text-sm font-medium text-white disabled:opacity-60 ${
              danger
                ? "bg-[var(--rock)] hover:bg-[color-mix(in_oklab,var(--rock)_88%,black)]"
                : "bg-[var(--sea)] hover:bg-[var(--sea-deep)]"
            }`}
          >
            {busy ? "…" : confirmLabel}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
