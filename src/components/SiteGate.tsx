"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  GATE_ROLE_KEY,
  GATE_TOKEN_KEY,
  setSiteAccess,
  syncAccessCookie,
  type SiteRole,
} from "@/lib/site-access";

/**
 * Site password is checked via /api/site-gate (not in the client bundle).
 * After success, unlock token + role stay in localStorage for this browser.
 */
export function SiteGate({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [unlocked, setUnlocked] = useState<boolean | null>(null);
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem(GATE_TOKEN_KEY);
    if (token) {
      if (!localStorage.getItem(GATE_ROLE_KEY)) {
        localStorage.setItem(GATE_ROLE_KEY, "staff");
      }
      syncAccessCookie(token);
      setUnlocked(true);
    } else {
      setUnlocked(false);
    }
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setPending(true);
    try {
      const res = await fetch("/api/site-gate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      const data = (await res.json()) as {
        ok?: boolean;
        token?: string;
        role?: SiteRole;
      };
      if (!res.ok || !data.ok || !data.token || !data.role) {
        setError("Falsches Passwort.");
        return;
      }
      setSiteAccess(data.role, data.token);
      syncAccessCookie(data.token);
      setUnlocked(true);
      router.refresh();
    } catch {
      setError("Verbindung fehlgeschlagen. Bitte erneut versuchen.");
    } finally {
      setPending(false);
    }
  }

  if (unlocked === null) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-[var(--foam)] text-sm text-[var(--ink-muted)]">
        …
      </div>
    );
  }

  if (!unlocked) {
    return (
      <div className="relative flex min-h-dvh flex-col items-center justify-center overflow-hidden px-4">
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: "url(/images/retrosail-scene.png)" }}
          aria-hidden
        />
        <div className="absolute inset-0 bg-[color-mix(in_oklab,var(--deep)_50%,transparent)]" />
        <form
          onSubmit={handleSubmit}
          className="relative z-10 w-full max-w-sm rounded-2xl border border-white/30 bg-[color-mix(in_oklab,var(--foam)_88%,transparent)] p-5 shadow-2xl backdrop-blur-md"
        >
          <h1 className="font-[family-name:var(--font-display)] text-3xl text-[var(--ink)]">
            RetroSail
          </h1>
          <p className="mt-1 text-sm text-[var(--ink-muted)]">
            Bitte Team-Passwort eingeben, um fortzufahren.
          </p>
          <label className="mt-4 block">
            <span className="sr-only">Passwort</span>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoFocus
              autoComplete="current-password"
              disabled={pending}
              className="h-10 w-full rounded-lg border border-[var(--line)] bg-white/90 px-3 text-sm outline-none focus:border-[var(--sea)] disabled:opacity-60"
              placeholder="Passwort"
            />
          </label>
          {error && (
            <p className="mt-2 text-sm text-[var(--rock)]" role="alert">
              {error}
            </p>
          )}
          <button
            type="submit"
            disabled={pending || !password}
            className="mt-4 h-10 w-full rounded-md bg-[var(--sea)] text-sm font-medium text-white hover:bg-[var(--sea-deep)] disabled:opacity-60"
          >
            {pending ? "Prüfen…" : "Eintreten"}
          </button>
        </form>
      </div>
    );
  }

  return <>{children}</>;
}
