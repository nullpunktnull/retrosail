import { Suspense } from "react";
import { ClaimLoginClient } from "@/components/ClaimLoginClient";

export default function ClaimLoginPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-dvh items-center justify-center bg-[var(--foam)] text-sm text-[var(--ink-muted)]">
          Login wird übernommen…
        </div>
      }
    >
      <ClaimLoginClient />
    </Suspense>
  );
}
