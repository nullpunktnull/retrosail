"use client";

import { useCallback, useEffect, useState, useTransition } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Header } from "@/components/Header";
import { SailScene } from "@/components/SailScene";
import { useLiveSurvey } from "@/hooks/useLiveSurvey";
import { getLatestActiveSurvey, getSurvey, listSurveys } from "@/lib/actions";
import type { SurveyDTO, SurveySummary } from "@/lib/identity";
import {
  getActiveSpace,
  getSiteAccessToken,
  getSiteRole,
  setActiveSpace,
  type SiteRole,
  type SurveySpace,
} from "@/lib/site-access";

type Props = {
  initialSurveys: SurveySummary[];
  initialSurvey: SurveyDTO | null;
  initialSpace: SurveySpace;
  initialRole: SiteRole | null;
};

export function RetroSailApp({
  initialSurveys,
  initialSurvey,
  initialSpace,
  initialRole,
}: Props) {
  const [surveys, setSurveys] = useState(initialSurveys);
  const [survey, setSurvey] = useState(initialSurvey);
  const [space, setSpace] = useState<SurveySpace>(initialSpace);
  const [role, setRole] = useState<SiteRole | null>(initialRole);
  const [, startTransition] = useTransition();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    const r = getSiteRole();
    const s = getActiveSpace(r);
    setRole(r);
    setSpace(s);
  }, []);

  const syncUrl = useCallback(
    (id: string | null) => {
      if (!id) {
        if (pathname !== "/") router.replace("/");
        return;
      }
      const target = `/s/${id}`;
      if (pathname !== target) router.replace(target);
    },
    [pathname, router],
  );

  const selectSurvey = useCallback(
    (id: string) => {
      startTransition(async () => {
        const next = await getSurvey(id, getSiteAccessToken());
        if (next) {
          setSurvey(next);
          syncUrl(next.id);
        }
      });
    },
    [syncUrl],
  );

  const loadSpace = useCallback(
    async (nextSpace: SurveySpace, preferSurveyId?: string | null) => {
      const accessToken = getSiteAccessToken();
      const [list, latest] = await Promise.all([
        listSurveys({ space: nextSpace, accessToken }),
        getLatestActiveSurvey({ space: nextSpace, accessToken }),
      ]);
      setSurveys(list);
      setSpace(nextSpace);

      if (preferSurveyId) {
        const preferred = list.find((s) => s.id === preferSurveyId);
        if (preferred) {
          const full = await getSurvey(preferSurveyId, accessToken);
          setSurvey(full);
          if (full) syncUrl(full.id);
          return;
        }
      }

      if (latest) {
        setSurvey(latest);
        syncUrl(latest.id);
      } else {
        setSurvey(null);
        syncUrl(null);
      }
    },
    [syncUrl],
  );

  async function handleSpaceChange(next: SurveySpace) {
    if (role !== "staff" || next === space) return;
    setActiveSpace(next);
    startTransition(async () => {
      await loadSpace(next);
      router.refresh();
    });
  }

  useEffect(() => {
    setSurveys(initialSurveys);
  }, [initialSurveys]);

  useEffect(() => {
    setSurvey(initialSurvey);
  }, [initialSurvey?.id]);

  useEffect(() => {
    setSpace(initialSpace);
  }, [initialSpace]);

  // Feature 2 — Live-Aktualisierung
  useLiveSurvey({
    surveyId: survey?.id ?? null,
    space,
    onSurvey: (next) => {
      setSurvey(next);
      setSurveys((prev) =>
        prev.map((s) =>
          s.id === next.id
            ? {
                ...s,
                goal: next.goal,
                status: next.status,
                space: next.space,
                entryCount: next.entries.length,
              }
            : s,
        ),
      );
    },
    onSurveyList: setSurveys,
  });

  function handleSurveyCreated(created: SurveyDTO) {
    setSurveys((prev) => [
      {
        id: created.id,
        goal: created.goal,
        creatorToken: created.creatorToken,
        status: created.status,
        space: created.space,
        sortOrder: created.sortOrder,
        createdAt: created.createdAt,
        entryCount: created.entries.length,
      },
      ...prev.filter((s) => s.id !== created.id),
    ]);
    setSurvey(created);
    syncUrl(created.id);
  }

  function handleSurveyDeleted(surveyId: string) {
    setSurveys((prev) => {
      const next = prev.filter((s) => s.id !== surveyId);
      if (survey?.id === surveyId) {
        const fallback =
          next.find((s) => s.status === "ACTIVE") ?? next[0] ?? null;
        if (fallback) {
          startTransition(async () => {
            const loaded = await getSurvey(fallback.id, getSiteAccessToken());
            setSurvey(loaded);
            if (loaded) syncUrl(loaded.id);
          });
        } else {
          setSurvey(null);
          syncUrl(null);
        }
      }
      return next;
    });
  }

  function handleSurveyChange(next: SurveyDTO) {
    setSurvey(next);
    setSurveys((prev) =>
      prev.map((s) =>
        s.id === next.id
          ? {
              ...s,
              goal: next.goal,
              status: next.status,
              space: next.space,
              entryCount: next.entries.length,
            }
          : s,
      ),
    );
  }

  const isStaff = role === "staff";

  return (
    <div className="flex h-dvh flex-col overflow-hidden">
      <Header
        surveys={surveys}
        currentSurveyId={survey?.id ?? null}
        space={space}
        isStaff={isStaff}
        onSpaceChange={handleSpaceChange}
        onSelectSurvey={selectSurvey}
        onSurveyCreated={handleSurveyCreated}
        onSurveysReordered={setSurveys}
        onSurveyDeleted={handleSurveyDeleted}
      />

      {survey ? (
        <SailScene
          survey={survey}
          isStaff={isStaff}
          onSurveyDeleted={handleSurveyDeleted}
          onSurveyChange={handleSurveyChange}
        />
      ) : (
        <div className="relative min-h-0 flex-1 overflow-hidden">
          <div
            className="absolute inset-0 bg-cover bg-center"
            style={{ backgroundImage: "url(/images/retrosail-scene.png)" }}
            aria-hidden
          />
          <div className="absolute inset-0 bg-[color-mix(in_oklab,var(--deep)_45%,transparent)]" />
          <div className="relative z-10 flex h-full flex-col items-center justify-center px-6 text-center">
            <h1 className="animate-rise font-[family-name:var(--font-display)] text-5xl text-white drop-shadow-lg sm:text-6xl">
              RetroSail
            </h1>
            <p className="animate-rise mt-3 max-w-md text-base text-white/85 [animation-delay:100ms]">
              Starte eine Umfrage mit einem klaren Ziel — euer Schiff segelt zur
              Insel.
            </p>
            <p className="animate-rise mt-6 text-sm text-white/70 [animation-delay:180ms]">
              Oben rechts: <span className="text-white">Neue Umfrage</span>
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
