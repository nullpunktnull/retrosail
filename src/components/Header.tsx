"use client";

import {
  DndContext,
  DragOverlay,
  PointerSensor,
  closestCorners,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useEffect, useMemo, useState, useTransition } from "react";
import {
  createSurvey,
  reorderSurveys,
  searchAll,
} from "@/lib/actions";
import {
  getOrCreateIdentity,
  type SurveyDTO,
  type SurveySummary,
} from "@/lib/identity";

type Props = {
  surveys: SurveySummary[];
  currentSurveyId: string | null;
  onSelectSurvey: (id: string) => void;
  onSurveyCreated: (survey: SurveyDTO) => void;
  onSurveysReordered: (surveys: SurveySummary[]) => void;
};

function SortableSurveyItem({
  survey,
  active,
  onSelect,
}: {
  survey: SurveySummary;
  active: boolean;
  onSelect: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: survey.id });

  return (
    <button
      ref={setNodeRef}
      type="button"
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.4 : 1,
      }}
      className={`group flex w-full items-start gap-2 rounded-md px-2 py-2 text-left text-sm transition ${
        active
          ? "bg-[color-mix(in_oklab,var(--sea)_18%,transparent)] text-[var(--ink)]"
          : "text-[var(--ink-muted)] hover:bg-black/5 hover:text-[var(--ink)]"
      }`}
      onClick={onSelect}
      {...attributes}
      {...listeners}
    >
      <span className="mt-0.5 shrink-0 cursor-grab text-[var(--ink-faint)] group-active:cursor-grabbing">
        ⋮⋮
      </span>
      <span className="min-w-0 flex-1">
        <span className="line-clamp-2 leading-snug">{survey.goal}</span>
        <span className="mt-0.5 block text-[11px] text-[var(--ink-faint)]">
          {survey.entryCount} Einträge
        </span>
      </span>
    </button>
  );
}

function DropColumn({
  id,
  title,
  surveys,
  currentSurveyId,
  onSelect,
}: {
  id: "ACTIVE" | "ARCHIVED";
  title: string;
  surveys: SurveySummary[];
  currentSurveyId: string | null;
  onSelect: (id: string) => void;
}) {
  const { setNodeRef, isOver } = useDroppable({ id });

  return (
    <div
      ref={setNodeRef}
      className={`flex min-h-0 flex-1 flex-col rounded-lg border p-2 ${
        isOver
          ? "border-[var(--sea)] bg-[color-mix(in_oklab,var(--sea)_10%,transparent)]"
          : "border-[var(--line)] bg-white/60"
      }`}
    >
      <div className="mb-2 flex items-center justify-between px-1">
        <h3 className="text-[11px] font-semibold tracking-[0.12em] text-[var(--ink-muted)] uppercase">
          {title}
        </h3>
        <span className="text-[11px] text-[var(--ink-faint)]">{surveys.length}</span>
      </div>
      <div className="min-h-0 flex-1 space-y-0.5 overflow-y-auto pr-1">
        <SortableContext
          items={surveys.map((s) => s.id)}
          strategy={verticalListSortingStrategy}
        >
          {surveys.length === 0 ? (
            <p className="px-2 py-6 text-center text-xs text-[var(--ink-faint)]">
              Hierhin ziehen
            </p>
          ) : (
            surveys.map((survey) => (
              <SortableSurveyItem
                key={survey.id}
                survey={survey}
                active={survey.id === currentSurveyId}
                onSelect={() => onSelect(survey.id)}
              />
            ))
          )}
        </SortableContext>
      </div>
    </div>
  );
}

export function Header({
  surveys,
  currentSurveyId,
  onSelectSurvey,
  onSurveyCreated,
  onSurveysReordered,
}: Props) {
  const [open, setOpen] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [goal, setGoal] = useState("");
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [searchResults, setSearchResults] = useState<Awaited<
    ReturnType<typeof searchAll>
  > | null>(null);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [localSurveys, setLocalSurveys] = useState(surveys);

  useEffect(() => {
    setLocalSurveys(surveys);
  }, [surveys]);

  const active = useMemo(
    () => localSurveys.filter((s) => s.status === "ACTIVE"),
    [localSurveys],
  );
  const archived = useMemo(
    () => localSurveys.filter((s) => s.status === "ARCHIVED"),
    [localSurveys],
  );

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
  );

  const current = localSurveys.find((s) => s.id === currentSurveyId);

  useEffect(() => {
    if (!search.trim()) {
      setSearchResults(null);
      return;
    }
    const t = setTimeout(() => {
      startTransition(async () => {
        const results = await searchAll(search);
        setSearchResults(results);
      });
    }, 250);
    return () => clearTimeout(t);
  }, [search]);

  function findContainer(id: string): "ACTIVE" | "ARCHIVED" | null {
    if (id === "ACTIVE" || id === "ARCHIVED") return id;
    const item = localSurveys.find((s) => s.id === id);
    return item?.status ?? null;
  }

  function onDragStart(event: DragStartEvent) {
    setActiveId(String(event.active.id));
  }

  function onDragEnd(event: DragEndEvent) {
    const { active: dragActive, over } = event;
    setActiveId(null);
    if (!over) return;

    const activeContainer = findContainer(String(dragActive.id));
    const overContainer = findContainer(String(over.id));
    if (!activeContainer || !overContainer) return;

    let nextActive = [...active];
    let nextArchived = [...archived];

    const fromList = activeContainer === "ACTIVE" ? nextActive : nextArchived;
    const toList = overContainer === "ACTIVE" ? nextActive : nextArchived;
    const fromIndex = fromList.findIndex((s) => s.id === dragActive.id);

    if (fromIndex < 0) return;

    if (activeContainer === overContainer) {
      const overIndex = toList.findIndex((s) => s.id === over.id);
      if (overIndex < 0 || fromIndex === overIndex) return;
      const moved = arrayMove(toList, fromIndex, overIndex);
      if (overContainer === "ACTIVE") nextActive = moved;
      else nextArchived = moved;
    } else {
      const [item] = fromList.splice(fromIndex, 1);
      const overIndex = toList.findIndex((s) => s.id === over.id);
      const updated = {
        ...item,
        status: overContainer as SurveySummary["status"],
      };
      if (overIndex >= 0) toList.splice(overIndex, 0, updated);
      else toList.push(updated);

      if (activeContainer === "ACTIVE") {
        nextActive = fromList;
        nextArchived = toList;
      } else {
        nextArchived = fromList;
        nextActive = toList;
      }
    }

    const next = [
      ...nextActive.map((s, i) => ({ ...s, status: "ACTIVE" as const, sortOrder: i })),
      ...nextArchived.map((s, i) => ({
        ...s,
        status: "ARCHIVED" as const,
        sortOrder: i,
      })),
    ];
    setLocalSurveys(next);
    onSurveysReordered(next);

    startTransition(async () => {
      await reorderSurveys({
        activeIds: nextActive.map((s) => s.id),
        archivedIds: nextArchived.map((s) => s.id),
      });
    });
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    const identity = getOrCreateIdentity();
    const result = await createSurvey({ goal, creatorToken: identity });
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setGoal("");
    setCreateOpen(false);
    setOpen(false);
    onSurveyCreated(result.survey);
  }

  const dragItem = localSurveys.find((s) => s.id === activeId);

  return (
    <header className="relative z-40 flex h-12 shrink-0 items-center gap-3 border-b border-[var(--line)] bg-[color-mix(in_oklab,var(--foam)_88%,transparent)] px-3 backdrop-blur-md">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex min-w-0 items-center gap-2 rounded-md px-2 py-1.5 text-sm text-[var(--ink)] transition hover:bg-black/5"
        aria-expanded={open}
      >
        <span className="font-[family-name:var(--font-display)] text-base tracking-wide">
          RetroSail
        </span>
        <span className="hidden max-w-[42vw] truncate text-[var(--ink-muted)] sm:inline">
          {current ? `· ${current.goal}` : "· Keine Umfrage"}
        </span>
        <span className="text-[var(--ink-faint)]">{open ? "▴" : "▾"}</span>
      </button>

      <div className="ml-auto flex items-center gap-2">
        <label className="relative hidden sm:block">
          <span className="sr-only">Suche</span>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Alles durchsuchen…"
            className="h-8 w-52 rounded-md border border-[var(--line)] bg-white/70 px-3 text-sm text-[var(--ink)] outline-none placeholder:text-[var(--ink-faint)] focus:border-[var(--sea)] md:w-72"
          />
          {searchResults && (
            <div className="absolute top-full right-0 mt-1 max-h-80 w-80 overflow-y-auto rounded-lg border border-[var(--line)] bg-[var(--foam)] p-2 shadow-lg">
              {searchResults.surveys.length === 0 &&
              searchResults.entries.length === 0 ? (
                <p className="px-2 py-3 text-xs text-[var(--ink-faint)]">
                  Keine Treffer
                </p>
              ) : (
                <>
                  {searchResults.surveys.map((s) => (
                    <button
                      key={s.id}
                      type="button"
                      className="block w-full rounded-md px-2 py-2 text-left text-sm hover:bg-black/5"
                      onClick={() => {
                        onSelectSurvey(s.id);
                        setSearch("");
                        setSearchResults(null);
                      }}
                    >
                      <span className="text-[10px] tracking-wider text-[var(--sea)] uppercase">
                        Ziel
                      </span>
                      <span className="mt-0.5 line-clamp-2 block">{s.goal}</span>
                    </button>
                  ))}
                  {searchResults.entries.map((e) => (
                    <button
                      key={e.id}
                      type="button"
                      className="block w-full rounded-md px-2 py-2 text-left text-sm hover:bg-black/5"
                      onClick={() => {
                        onSelectSurvey(e.surveyId);
                        setSearch("");
                        setSearchResults(null);
                      }}
                    >
                      <span className="text-[10px] tracking-wider text-[var(--ink-faint)] uppercase">
                        {e.type} · {e.authorName}
                      </span>
                      <span className="mt-0.5 line-clamp-2 block">{e.content}</span>
                    </button>
                  ))}
                </>
              )}
            </div>
          )}
        </label>

        <button
          type="button"
          onClick={() => {
            setCreateOpen(true);
            setOpen(false);
          }}
          className="h-8 rounded-md bg-[var(--sea)] px-3 text-sm font-medium text-white transition hover:bg-[var(--sea-deep)]"
        >
          Neue Umfrage
        </button>
      </div>

      {open && (
        <>
          <button
            type="button"
            className="fixed inset-0 z-40 cursor-default bg-black/10"
            aria-label="Schliessen"
            onClick={() => setOpen(false)}
          />
          <div className="absolute top-full left-0 z-50 mt-0 w-full max-w-3xl border-b border-[var(--line)] bg-[var(--foam)] p-3 shadow-xl sm:left-3 sm:mt-1 sm:rounded-xl sm:border">
            <DndContext
              sensors={sensors}
              collisionDetection={closestCorners}
              onDragStart={onDragStart}
              onDragEnd={onDragEnd}
            >
              <div className="flex h-72 gap-3">
                <DropColumn
                  id="ACTIVE"
                  title="Aktiv"
                  surveys={active}
                  currentSurveyId={currentSurveyId}
                  onSelect={(id) => {
                    onSelectSurvey(id);
                    setOpen(false);
                  }}
                />
                <DropColumn
                  id="ARCHIVED"
                  title="Archiv"
                  surveys={archived}
                  currentSurveyId={currentSurveyId}
                  onSelect={(id) => {
                    onSelectSurvey(id);
                    setOpen(false);
                  }}
                />
              </div>
              <DragOverlay>
                {dragItem ? (
                  <div className="rounded-md border border-[var(--line)] bg-white px-3 py-2 text-sm shadow-lg">
                    {dragItem.goal}
                  </div>
                ) : null}
              </DragOverlay>
            </DndContext>
            {pending && (
              <p className="mt-2 text-[11px] text-[var(--ink-faint)]">Speichern…</p>
            )}
          </div>
        </>
      )}

      {createOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/35 p-4">
          <form
            onSubmit={handleCreate}
            className="w-full max-w-lg rounded-2xl border border-[var(--line)] bg-[var(--foam)] p-5 shadow-2xl"
          >
            <h2 className="font-[family-name:var(--font-display)] text-2xl text-[var(--ink)]">
              Neue Umfrage
            </h2>
            <p className="mt-1 text-sm text-[var(--ink-muted)]">
              Definiere ein klares Ziel — es erscheint bei der Insel.
            </p>
            <textarea
              value={goal}
              onChange={(e) => setGoal(e.target.value)}
              rows={4}
              placeholder='z.B. „Bis Ende Jahr sollen 50% der Arbeiten xy erledigt sein.“'
              className="mt-4 w-full rounded-lg border border-[var(--line)] bg-white/80 px-3 py-2 text-sm text-[var(--ink)] outline-none focus:border-[var(--sea)]"
              autoFocus
            />
            {error && (
              <p className="mt-2 text-sm text-[var(--rock)]" role="alert">
                {error}
              </p>
            )}
            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setCreateOpen(false)}
                className="h-9 rounded-md px-3 text-sm text-[var(--ink-muted)] hover:bg-black/5"
              >
                Abbrechen
              </button>
              <button
                type="submit"
                className="h-9 rounded-md bg-[var(--sea)] px-4 text-sm font-medium text-white hover:bg-[var(--sea-deep)]"
              >
                Starten
              </button>
            </div>
          </form>
        </div>
      )}
    </header>
  );
}
