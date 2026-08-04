"use client";

import { useEffect, useState } from "react";
import {
  canEditEntry,
  canEditSurvey,
  getOrCreateIdentity,
  type EntryDTO,
  type EntryType,
  type SurveyDTO,
} from "@/lib/identity";
import { renderRichText } from "@/lib/rich-text";
import { updateSurveyGoal } from "@/lib/actions";
import { EntryModal } from "./EntryModal";

type Props = {
  survey: SurveyDTO;
  onSurveyChange: (survey: SurveyDTO) => void;
};

const ZONE_META: Record<
  EntryType,
  { label: string; hint: string; addLabel: string }
> = {
  WIND: {
    label: "Wind",
    hint: "Was treibt uns voran?",
    addLabel: "+ Wind",
  },
  ANCHOR: {
    label: "Anker",
    hint: "Was hält uns zurück?",
    addLabel: "+ Anker",
  },
  ROCK: {
    label: "Felsen",
    hint: "Was macht das Ziel unmöglich?",
    addLabel: "+ Felsen",
  },
};

function EntryCard({
  entry,
  editable,
  onEdit,
}: {
  entry: EntryDTO;
  editable: boolean;
  onEdit: () => void;
}) {
  return (
    <article
      className={`rounded-lg border border-white/25 bg-[color-mix(in_oklab,var(--foam)_82%,transparent)] px-2.5 py-2 text-left shadow-sm backdrop-blur-sm ${
        editable ? "cursor-pointer transition hover:border-[var(--sea)]" : ""
      }`}
      onClick={editable ? onEdit : undefined}
      role={editable ? "button" : undefined}
      tabIndex={editable ? 0 : undefined}
      onKeyDown={
        editable
          ? (e) => {
              if (e.key === "Enter" || e.key === " ") onEdit();
            }
          : undefined
      }
    >
      <p className="text-[13px] leading-snug text-[var(--ink)]">
        {renderRichText(entry.content)}
      </p>
      <p className="mt-1 text-[11px] text-[var(--ink-faint)]">{entry.authorName}</p>
    </article>
  );
}

function Zone({
  type,
  entries,
  identity,
  survey,
  onAdd,
  onEdit,
}: {
  type: EntryType;
  entries: EntryDTO[];
  identity: string;
  survey: SurveyDTO;
  onAdd: () => void;
  onEdit: (entry: EntryDTO) => void;
}) {
  const meta = ZONE_META[type];
  return (
    <section className="flex min-h-0 flex-col gap-2">
      <div className="flex items-end justify-between gap-2">
        <div>
          <h3 className="font-[family-name:var(--font-display)] text-lg text-[var(--ink)] drop-shadow-sm">
            {meta.label}
          </h3>
          <p className="text-[11px] text-[var(--ink-muted)]">{meta.hint}</p>
        </div>
        <button
          type="button"
          onClick={onAdd}
          className="shrink-0 rounded-md bg-[var(--sea)]/90 px-2.5 py-1 text-xs font-medium text-white backdrop-blur hover:bg-[var(--sea)]"
        >
          {meta.addLabel}
        </button>
      </div>
      <div className="flex max-h-[28vh] flex-col gap-1.5 overflow-y-auto pr-1 sm:max-h-[32vh]">
        {entries.length === 0 ? (
          <p className="rounded-lg border border-dashed border-white/30 bg-white/20 px-3 py-4 text-center text-xs text-[var(--ink-muted)] backdrop-blur-sm">
            Noch leer — sei der Erste.
          </p>
        ) : (
          entries.map((entry) => (
            <EntryCard
              key={entry.id}
              entry={entry}
              editable={canEditEntry(entry, survey, identity)}
              onEdit={() => onEdit(entry)}
            />
          ))
        )}
      </div>
    </section>
  );
}

export function SailScene({ survey, onSurveyChange }: Props) {
  const [identity, setIdentity] = useState("");
  const [modal, setModal] = useState<
    | { kind: "create"; type: EntryType }
    | { kind: "edit"; entry: EntryDTO }
    | null
  >(null);
  const [editingGoal, setEditingGoal] = useState(false);
  const [goalDraft, setGoalDraft] = useState(survey.goal);
  const [goalError, setGoalError] = useState("");

  useEffect(() => {
    setIdentity(getOrCreateIdentity());
  }, []);

  useEffect(() => {
    setGoalDraft(survey.goal);
    setEditingGoal(false);
  }, [survey.id, survey.goal]);

  const wind = survey.entries.filter((e) => e.type === "WIND");
  const anchor = survey.entries.filter((e) => e.type === "ANCHOR");
  const rock = survey.entries.filter((e) => e.type === "ROCK");
  const isCreator = canEditSurvey(survey, identity);

  function upsertEntry(entry: EntryDTO) {
    const index = survey.entries.findIndex((e) => e.id === entry.id);
    if (index === -1) {
      onSurveyChange({ ...survey, entries: [...survey.entries, entry] });
      return;
    }
    const entries = [...survey.entries];
    entries[index] = entry;
    onSurveyChange({ ...survey, entries });
  }

  function removeEntry(entryId: string) {
    onSurveyChange({
      ...survey,
      entries: survey.entries.filter((e) => e.id !== entryId),
    });
  }

  async function saveGoal(e: React.FormEvent) {
    e.preventDefault();
    setGoalError("");
    const result = await updateSurveyGoal({
      surveyId: survey.id,
      goal: goalDraft,
      identityToken: identity,
    });
    if (!result.ok) {
      setGoalError(result.error);
      return;
    }
    onSurveyChange(result.survey);
    setEditingGoal(false);
  }

  return (
    <div className="relative min-h-0 flex-1 overflow-hidden">
      {/* Full-bleed scene */}
      <div
        className="absolute inset-0 bg-cover bg-center bg-no-repeat"
        style={{ backgroundImage: "url(/images/retrosail-scene.png)" }}
        aria-hidden
      />
      <div className="absolute inset-0 bg-gradient-to-b from-[color-mix(in_oklab,var(--sky)_35%,transparent)] via-transparent to-[color-mix(in_oklab,var(--deep)_28%,transparent)]" />

      {/* Soft entrance motions */}
      <div className="pointer-events-none absolute inset-0">
        <div className="animate-drift absolute top-[18%] left-[28%] h-16 w-40 rounded-full bg-white/10 blur-2xl" />
        <div className="animate-sway absolute top-[42%] left-[44%] h-24 w-24 rounded-full bg-[var(--sea)]/10 blur-3xl" />
      </div>

      <div className="relative z-10 mx-auto grid h-full max-w-6xl grid-rows-[auto_minmax(0,1fr)_auto] gap-3 p-3 sm:gap-4 sm:p-5 lg:grid-cols-[1fr_minmax(240px,320px)] lg:grid-rows-[auto_minmax(0,1fr)]">
        {/* Island / Goal */}
        <div className="lg:col-start-2 lg:row-start-1">
          <div className="animate-rise rounded-2xl border border-white/30 bg-[color-mix(in_oklab,var(--foam)_78%,transparent)] p-4 shadow-lg backdrop-blur-md">
            <p className="text-[11px] font-semibold tracking-[0.16em] text-[var(--island)] uppercase">
              Insel · Ziel
            </p>
            {editingGoal ? (
              <form onSubmit={saveGoal} className="mt-2 space-y-2">
                <textarea
                  value={goalDraft}
                  onChange={(e) => setGoalDraft(e.target.value)}
                  rows={3}
                  className="w-full rounded-lg border border-[var(--line)] bg-white/90 px-3 py-2 text-sm outline-none focus:border-[var(--sea)]"
                  autoFocus
                />
                {goalError && (
                  <p className="text-sm text-[var(--rock)]">{goalError}</p>
                )}
                <div className="flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setEditingGoal(false);
                      setGoalDraft(survey.goal);
                    }}
                    className="h-8 rounded-md px-2 text-xs text-[var(--ink-muted)]"
                  >
                    Abbrechen
                  </button>
                  <button
                    type="submit"
                    className="h-8 rounded-md bg-[var(--sea)] px-3 text-xs font-medium text-white"
                  >
                    Speichern
                  </button>
                </div>
              </form>
            ) : (
              <>
                <h2 className="mt-1 font-[family-name:var(--font-display)] text-xl leading-snug text-[var(--ink)] sm:text-2xl">
                  {survey.goal}
                </h2>
                {isCreator && (
                  <button
                    type="button"
                    onClick={() => setEditingGoal(true)}
                    className="mt-2 text-xs text-[var(--sea-deep)] underline-offset-2 hover:underline"
                  >
                    Ziel bearbeiten
                  </button>
                )}
              </>
            )}
          </div>
        </div>

        {/* Wind (above ship conceptually) */}
        <div className="animate-rise [animation-delay:80ms] lg:col-start-1 lg:row-start-1 lg:row-span-1">
          <div className="rounded-2xl border border-white/25 bg-[color-mix(in_oklab,var(--foam)_55%,transparent)] p-3 backdrop-blur-md sm:p-4">
            <Zone
              type="WIND"
              entries={wind}
              identity={identity}
              survey={survey}
              onAdd={() => setModal({ kind: "create", type: "WIND" })}
              onEdit={(entry) => setModal({ kind: "edit", entry })}
            />
          </div>
        </div>

        {/* Anchor + Rock lower area */}
        <div className="animate-rise grid min-h-0 gap-3 [animation-delay:140ms] sm:grid-cols-2 lg:col-span-2 lg:row-start-2">
          <div className="rounded-2xl border border-white/25 bg-[color-mix(in_oklab,var(--foam)_55%,transparent)] p-3 backdrop-blur-md sm:p-4">
            <Zone
              type="ANCHOR"
              entries={anchor}
              identity={identity}
              survey={survey}
              onAdd={() => setModal({ kind: "create", type: "ANCHOR" })}
              onEdit={(entry) => setModal({ kind: "edit", entry })}
            />
          </div>
          <div className="rounded-2xl border border-white/25 bg-[color-mix(in_oklab,var(--foam)_55%,transparent)] p-3 backdrop-blur-md sm:p-4">
            <Zone
              type="ROCK"
              entries={rock}
              identity={identity}
              survey={survey}
              onAdd={() => setModal({ kind: "create", type: "ROCK" })}
              onEdit={(entry) => setModal({ kind: "edit", entry })}
            />
          </div>
        </div>
      </div>

      {/* Ship label — subtle, doesn't fight the brand */}
      <p className="pointer-events-none absolute bottom-[38%] left-1/2 z-10 hidden -translate-x-1/2 text-center text-[11px] tracking-[0.2em] text-white/80 uppercase drop-shadow md:block">
        Wir · das Schiff
      </p>

      <EntryModal
        surveyId={survey.id}
        mode={modal}
        onClose={() => setModal(null)}
        onSaved={upsertEntry}
        onDeleted={removeEntry}
      />
    </div>
  );
}
