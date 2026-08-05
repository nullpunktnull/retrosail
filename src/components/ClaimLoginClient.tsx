"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { setIdentity, setStoredName } from "@/lib/identity";

/**
 * Opens a shared login link and writes identity into localStorage.
 * Usage: /claim?t=<token>&n=<optional-name>
 */
export function ClaimLoginClient() {
  const router = useRouter();
  const params = useSearchParams();
  const [status, setStatus] = useState<"working" | "ok" | "error">("working");

  useEffect(() => {
    const token = params.get("t")?.trim() ?? "";
    if (!token) {
      setStatus("error");
      return;
    }

    setIdentity(token);
    const name = params.get("n")?.trim();
    if (name) setStoredName(name);
    setStatus("ok");

    const t = window.setTimeout(() => {
      router.replace("/");
    }, 1200);
    return () => window.clearTimeout(t);
  }, [params, router]);

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-3 bg-[var(--foam)] px-6 text-center">
      <h1 className="font-[family-name:var(--font-display)] text-3xl text-[var(--ink)]">
        {status === "error" ? "Link ungültig" : "Login übernommen"}
      </h1>
      <p className="max-w-sm text-sm text-[var(--ink-muted)]">
        {status === "error"
          ? "Dieser Login-Link enthält keine Kennung."
          : "Dieses Gerät nutzt jetzt dieselbe Kennung. Weiterleitung…"}
      </p>
      {status === "error" && (
        <a
          href="/"
          className="mt-2 rounded-md bg-[var(--sea)] px-4 py-2 text-sm font-medium text-white hover:bg-[var(--sea-deep)]"
        >
          Zur App
        </a>
      )}
    </div>
  );
}
