"use client";

import { useCallback, useEffect, useState, useTransition } from "react";
import { Header } from "@/components/Header";
import { SailScene } from "@/components/SailScene";
import { getSurvey } from "@/lib/actions";
import type { SurveyDTO, SurveySummary } from "@/lib/identity";

type Props = {
  initialSurveys: SurveySummary[];
  initialSurvey: SurveyDTO | null;
};

export function RetroSailApp({ initialSurveys, initialSurvey }: Props) {
  const [surveys, setSurveys] = useState(initialSurveys);
  const [survey, setSurvey] = useState(initialSurvey);
  const [, startTransition] = useTransition();

  const selectSurvey = useCallback((id: string) => {
    startTransition(async () => {
      const next = await getSurvey(id);
      if (next) setSurvey(next);
    });
  }, []);

  useEffect(() => {
    setSurveys(initialSurveys);
  }, [initialSurveys]);

  function handleSurveyCreated(created: SurveyDTO) {
    setSurveys((prev) => [
      {
        id: created.id,
        goal: created.goal,
        creatorToken: created.creatorToken,
        status: created.status,
        sortOrder: created.sortOrder,
        createdAt: created.createdAt,
        entryCount: created.entries.length,
      },
      ...prev.filter((s) => s.id !== created.id),
    ]);
    setSurvey(created);
  }

  function handleSurveyDeleted(surveyId: string) {
    setSurveys((prev) => {
      const next = prev.filter((s) => s.id !== surveyId);
      if (survey?.id === surveyId) {
        const fallback = next.find((s) => s.status === "ACTIVE") ?? next[0] ?? null;
        if (fallback) {
          startTransition(async () => {
            const loaded = await getSurvey(fallback.id);
            setSurvey(loaded);
          });
        } else {
          setSurvey(null);
        }
      }
      return next;
    });
  }

  return (
    <div className="flex h-dvh flex-col overflow-hidden">
      <Header
        surveys={surveys}
        currentSurveyId={survey?.id ?? null}
        onSelectSurvey={selectSurvey}
        onSurveyCreated={handleSurveyCreated}
        onSurveysReordered={setSurveys}
        onSurveyDeleted={handleSurveyDeleted}
      />

      {survey ? (
        <SailScene
          survey={survey}
          onSurveyDeleted={handleSurveyDeleted}
          onSurveyChange={(next) => {
            setSurvey(next);
            setSurveys((prev) =>
              prev.map((s) =>
                s.id === next.id
                  ? {
                      ...s,
                      goal: next.goal,
                      status: next.status,
                      entryCount: next.entries.length,
                    }
                  : s,
              ),
            );
          }}
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
              Oben rechts:{" "}
              <span className="text-white">Neue Umfrage</span>
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
