"use client";

import { useEffect, useState } from "react";

type Props = {
  surveyId: string;
};

/** Feature 3 — Teilen-Link `/s/[id]` in die Zwischenablage. */
export function ShareLinkButton({ surveyId }: Props) {
  const [copied, setCopied] = useState(false);
  const [url, setUrl] = useState("");

  useEffect(() => {
    setUrl(`${window.location.origin}/s/${surveyId}`);
    setCopied(false);
  }, [surveyId]);

  async function copy() {
    const link = url || `${window.location.origin}/s/${surveyId}`;
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  }

  return (
    <button
      type="button"
      onClick={copy}
      className="text-xs text-[var(--sea-deep)] underline-offset-2 hover:underline"
      title={url || "Teilen-Link kopieren"}
    >
      {copied ? "Link kopiert ✓" : "Link teilen"}
    </button>
  );
}
