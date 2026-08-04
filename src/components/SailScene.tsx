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
import { deleteSurvey, updateSurveyGoal } from "@/lib/actions";
import { EntryModal } from "./EntryModal";

type Props = {
  survey: SurveyDTO;
  onSurveyChange: (survey: SurveyDTO) => void;
  onSurveyDeleted: (surveyId: string) => void;
};

const ZONE_META: Record<
  EntryType,
  { title: string; addLabel: string }
> = {
  WIND: {
    title: "Was treibt uns voran?",
    addLabel: "+",
  },
  ANCHOR: {
    title: "Was hält uns zurück?",
    addLabel: "+",
  },
  ROCK: {
    title: "Was macht das Ziel unmöglich?",
    addLabel: "+",
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

function ZonePanel({
  type,
  entries,
  identity,
  survey,
  onAdd,
  onEdit,
  className,
}: {
  type: EntryType;
  entries: EntryDTO[];
  identity: string;
  survey: SurveyDTO;
  onAdd: () => void;
  onEdit: (entry: EntryDTO) => void;
  className?: string;
}) {
  const meta = ZONE_META[type];
  return (
    <section
      className={`flex min-h-0 flex-col gap-2 rounded-2xl border border-white/25 bg-[color-mix(in_oklab,var(--foam)_58%,transparent)] p-3 shadow-lg backdrop-blur-md sm:p-3.5 ${className ?? ""}`}
    >
      <div className="flex items-start justify-between gap-2">
        <h3 className="font-[family-name:var(--font-display)] text-base leading-snug text-[var(--ink)] drop-shadow-sm sm:text-lg">
          {meta.title}
        </h3>
        <button
          type="button"
          onClick={onAdd}
          className="shrink-0 rounded-md bg-[var(--sea)]/90 px-2 py-1 text-xs font-medium text-white backdrop-blur hover:bg-[var(--sea)]"
          aria-label={`${meta.title} hinzufügen`}
        >
          {meta.addLabel}
        </button>
      </div>
      <div className="flex min-h-0 flex-1 flex-col gap-1.5 overflow-y-auto pr-1">
        {entries.length === 0 ? (
          <p className="rounded-lg border border-dashed border-white/30 bg-white/20 px-3 py-3 text-center text-xs text-[var(--ink-muted)] backdrop-blur-sm">
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

export function SailScene({ survey, onSurveyChange, onSurveyDeleted }: Props) {
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

  async function handleDeleteSurvey() {
    if (
      !confirm(
        `Umfrage wirklich löschen?\n\n„${survey.goal.slice(0, 120)}${survey.goal.length > 120 ? "…" : ""}“\n\nAlle Einträge gehen verloren.`,
      )
    ) {
      return;
    }
    const result = await deleteSurvey({
      surveyId: survey.id,
      identityToken: identity,
    });
    if (!result.ok) {
      alert(result.error);
      return;
    }
    onSurveyDeleted(survey.id);
  }

  return (
    <div className="relative min-h-0 flex-1 overflow-hidden">
      <div
        className="absolute inset-0 bg-cover bg-center bg-no-repeat"
        style={{ backgroundImage: "url(/images/retrosail-scene.png)" }}
        aria-hidden
      />
      <div className="absolute inset-0 bg-gradient-to-b from-[color-mix(in_oklab,var(--sky)_22%,transparent)] via-transparent to-[color-mix(in_oklab,var(--deep)_22%,transparent)]" />

      <div className="pointer-events-none absolute inset-0">
        <div className="animate-drift absolute top-[14%] left-[22%] h-14 w-36 rounded-full bg-white/10 blur-2xl" />
        <div className="animate-sway absolute top-[40%] left-[42%] h-20 w-20 rounded-full bg-[var(--sea)]/10 blur-3xl" />
      </div>

      {/* Wind — top left, near wind swirls */}
      <div className="absolute top-3 left-3 z-10 w-[min(100%-1.5rem,20rem)] max-h-[38%] sm:top-4 sm:left-4 sm:w-[22rem]">
        <ZonePanel
          className="animate-rise max-h-full"
          type="WIND"
          entries={wind}
          identity={identity}
          survey={survey}
          onAdd={() => setModal({ kind: "create", type: "WIND" })}
          onEdit={(entry) => setModal({ kind: "edit", entry })}
        />
      </div>

      {/* Goal — top right, above island */}
      <div className="absolute top-3 right-3 z-10 w-[min(100%-1.5rem,22rem)] sm:top-4 sm:right-4 sm:w-[24rem]">
        <div className="animate-rise rounded-2xl border border-white/30 bg-[color-mix(in_oklab,var(--foam)_78%,transparent)] p-3.5 shadow-lg backdrop-blur-md sm:p-4">
          <p className="font-[family-name:var(--font-display)] text-base leading-snug text-[var(--ink)] sm:text-lg">
            Wohin wollen wir?
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
              <h2 className="mt-1.5 text-sm leading-snug text-[var(--ink)] sm:text-base">
                {survey.goal}
              </h2>
{isCreator && (
                  <div className="mt-2 flex flex-wrap gap-3">
                    <button
                      type="button"
                      onClick={() => setEditingGoal(true)}
                      className="text-xs text-[var(--sea-deep)] underline-offset-2 hover:underline"
                    >
                      Ziel bearbeiten
                    </button>
                    <button
                      type="button"
                      onClick={handleDeleteSurvey}
                      className="text-xs text-[var(--rock)] underline-offset-2 hover:underline"
                    >
                      Umfrage löschen
                    </button>
                  </div>
                )}
            </>
          )}
        </div>
      </div>

      {/* Anchor — bottom left, near anchor, clear of ship */}
      <div className="absolute bottom-3 left-3 z-10 w-[min(100%-1.5rem,20rem)] max-h-[36%] sm:bottom-4 sm:left-4 sm:w-[22rem]">
        <ZonePanel
          className="animate-rise max-h-full [animation-delay:100ms]"
          type="ANCHOR"
          entries={anchor}
          identity={identity}
          survey={survey}
          onAdd={() => setModal({ kind: "create", type: "ANCHOR" })}
          onEdit={(entry) => setModal({ kind: "edit", entry })}
        />
      </div>

      {/* Rocks — bottom right, flush with edge */}
      <div className="absolute right-3 bottom-3 z-10 w-[min(100%-1.5rem,20rem)] max-h-[36%] sm:right-4 sm:bottom-4 sm:w-[22rem]">
        <ZonePanel
          className="animate-rise max-h-full [animation-delay:160ms]"
          type="ROCK"
          entries={rock}
          identity={identity}
          survey={survey}
          onAdd={() => setModal({ kind: "create", type: "ROCK" })}
          onEdit={(entry) => setModal({ kind: "edit", entry })}
        />
      </div>

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
