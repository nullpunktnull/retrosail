"use client";

import { useEffect, useRef } from "react";
import { getSurvey, listSurveys } from "@/lib/actions";
import type { SurveyDTO, SurveySummary } from "@/lib/identity";

const DEFAULT_MS = 4000;

function surveyFingerprint(s: SurveyDTO): string {
  const entrySig = s.entries
    .map((e) => `${e.id}:${e.updatedAt}:${e.content.length}`)
    .join("|");
  return `${s.id}:${s.updatedAt}:${s.goal}:${s.status}:${entrySig}`;
}

type Options = {
  surveyId: string | null;
  enabled?: boolean;
  intervalMs?: number;
  onSurvey: (survey: SurveyDTO) => void;
  onSurveyList?: (surveys: SurveySummary[]) => void;
};

/**
 * Feature 2 — Live-Aktualisierung.
 * Pollt die aktuelle Umfrage (und optional die Liste), solange der Tab sichtbar ist.
 */
export function useLiveSurvey({
  surveyId,
  enabled = true,
  intervalMs = DEFAULT_MS,
  onSurvey,
  onSurveyList,
}: Options) {
  const onSurveyRef = useRef(onSurvey);
  const onListRef = useRef(onSurveyList);
  const lastFp = useRef("");

  useEffect(() => {
    onSurveyRef.current = onSurvey;
  }, [onSurvey]);

  useEffect(() => {
    onListRef.current = onSurveyList;
  }, [onSurveyList]);

  useEffect(() => {
    lastFp.current = "";
  }, [surveyId]);

  useEffect(() => {
    if (!enabled || !surveyId) return;

    let cancelled = false;

    async function tick() {
      if (cancelled || document.hidden) return;
      try {
        const [next, list] = await Promise.all([
          getSurvey(surveyId!),
          onListRef.current ? listSurveys() : Promise.resolve(null),
        ]);
        if (cancelled || !next) return;
        const fp = surveyFingerprint(next);
        if (fp !== lastFp.current) {
          lastFp.current = fp;
          onSurveyRef.current(next);
        }
        if (list && onListRef.current) {
          onListRef.current(list);
        }
      } catch {
        // silent — live refresh is best-effort
      }
    }

    const id = window.setInterval(tick, intervalMs);
    const onVis = () => {
      if (!document.hidden) void tick();
    };
    document.addEventListener("visibilitychange", onVis);
    void tick();

    return () => {
      cancelled = true;
      window.clearInterval(id);
      document.removeEventListener("visibilitychange", onVis);
    };
  }, [surveyId, enabled, intervalMs]);
}
