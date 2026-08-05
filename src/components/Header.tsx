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
import { createPortal } from "react-dom";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import {
  createSurvey,
  deleteSurvey,
  reorderSurveys,
  searchAll,
} from "@/lib/actions";
import {
  buildShareLoginUrl,
  canEditSurvey,
  getOrCreateIdentity,
  type SurveyDTO,
  type SurveySummary,
} from "@/lib/identity";
import { getSiteAccessToken } from "@/lib/site-access";

type Props = {
  surveys: SurveySummary[];
  currentSurveyId: string | null;
  space: "TEAM" | "LEARNERS";
  isStaff: boolean;
  onSpaceChange: (space: "TEAM" | "LEARNERS") => void;
  onSelectSurvey: (id: string) => void;
  onSurveyCreated: (survey: SurveyDTO) => void;
  onSurveysReordered: (surveys: SurveySummary[]) => void;
  onSurveyDeleted: (surveyId: string) => void;
};

function SortableSurveyItem({
  survey,
  active,
  canDelete,
  onSelect,
  onDelete,
}: {
  survey: SurveySummary;
  active: boolean;
  canDelete: boolean;
  onSelect: () => void;
  onDelete: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: survey.id });

  return (
    <div
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.4 : 1,
      }}
      className={`group flex w-full items-start gap-1 rounded-md px-1 py-1 text-sm transition ${
        active
          ? "bg-[color-mix(in_oklab,var(--sea)_18%,transparent)] text-[var(--ink)]"
          : "text-[var(--ink-muted)] hover:bg-black/5 hover:text-[var(--ink)]"
      }`}
    >
      <button
        type="button"
        className="mt-1 shrink-0 cursor-grab px-1 text-[var(--ink-faint)] group-active:cursor-grabbing"
        aria-label="Verschieben"
        {...attributes}
        {...listeners}
      >
        ⋮⋮
      </button>
      <button
        type="button"
        className="min-w-0 flex-1 px-1 py-1 text-left"
        onClick={onSelect}
      >
        <span className="line-clamp-2 leading-snug">{survey.goal}</span>
        <span className="mt-0.5 block text-[11px] text-[var(--ink-faint)]">
          {survey.entryCount} Einträge
        </span>
      </button>
      {canDelete && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onDelete();
          }}
          className="mt-1 shrink-0 rounded px-1.5 py-1 text-[11px] text-[var(--rock)] opacity-70 hover:bg-[color-mix(in_oklab,var(--rock)_12%,transparent)] hover:opacity-100"
          title="Umfrage löschen"
          aria-label="Umfrage löschen"
        >
          ✕
        </button>
      )}
    </div>
  );
}

function DropColumn({
  id,
  title,
  surveys,
  currentSurveyId,
  identity,
  isStaff,
  onSelect,
  onDelete,
}: {
  id: "ACTIVE" | "ARCHIVED";
  title: string;
  surveys: SurveySummary[];
  currentSurveyId: string | null;
  identity: string;
  isStaff: boolean;
  onSelect: (id: string) => void;
  onDelete: (id: string) => void;
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
                canDelete={canEditSurvey(survey, identity, isStaff)}
                onSelect={() => onSelect(survey.id)}
                onDelete={() => onDelete(survey.id)}
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
  space,
  isStaff,
  onSpaceChange,
  onSelectSurvey,
  onSurveyCreated,
  onSurveysReordered,
  onSurveyDeleted,
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
  const [identity, setIdentity] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<SurveySummary | null>(null);
  const [deleteBusy, setDeleteBusy] = useState(false);
  const [deleteError, setDeleteError] = useState("");
  const [shareNote, setShareNote] = useState(false);

  useEffect(() => {
    setIdentity(getOrCreateIdentity());
  }, []);

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

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
        const results = await searchAll(search, {
          space,
          accessToken: getSiteAccessToken(),
        });
        setSearchResults(results);
      });
    }, 250);
    return () => clearTimeout(t);
  }, [search, space]);

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
        space,
        accessToken: getSiteAccessToken(),
      });
    });
  }

  async function handleShareLogin() {
    const link = buildShareLoginUrl();
    try {
      await navigator.clipboard.writeText(link);
    } catch {
      // Fallback for older browsers / insecure context
      const ta = document.createElement("textarea");
      ta.value = link;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      document.body.removeChild(ta);
    }
    setShareNote(true);
    window.setTimeout(() => setShareNote(false), 4500);
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    const token = getOrCreateIdentity();
    setIdentity(token);
    const result = await createSurvey({
      goal,
      creatorToken: token,
      space,
      accessToken: getSiteAccessToken(),
    });
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setGoal("");
    setCreateOpen(false);
    setOpen(false);
    onSurveyCreated(result.survey);
  }

  function requestDeleteSurvey(surveyId: string) {
    const survey = localSurveys.find((s) => s.id === surveyId);
    if (!survey) return;
    setDeleteError("");
    setDeleteTarget(survey);
  }

  async function confirmDeleteSurvey() {
    if (!deleteTarget) return;
    setDeleteBusy(true);
    setDeleteError("");
    const token = getOrCreateIdentity();
    const result = await deleteSurvey({
      surveyId: deleteTarget.id,
      identityToken: token,
      accessToken: getSiteAccessToken(),
    });
    setDeleteBusy(false);
    if (!result.ok) {
      setDeleteError(result.error);
      return;
    }
    const id = deleteTarget.id;
    setDeleteTarget(null);
    setLocalSurveys((prev) => prev.filter((s) => s.id !== id));
    onSurveyDeleted(id);
  }

  const dragItem = localSurveys.find((s) => s.id === activeId);

  return (
    <header className="relative z-50 flex h-12 shrink-0 items-center gap-2 border-b border-[var(--line)] bg-[color-mix(in_oklab,var(--foam)_88%,transparent)] px-3 backdrop-blur-md sm:gap-3">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex min-w-0 items-center gap-2 rounded-md px-2 py-1.5 text-sm text-[var(--ink)] transition hover:bg-black/5"
        aria-expanded={open}
      >
        <span className="font-[family-name:var(--font-display)] text-base tracking-wide">
          RetroSail
        </span>
        <span className="hidden max-w-[28vw] truncate text-[var(--ink-muted)] lg:inline">
          {current ? `· ${current.goal}` : "· Keine Umfrage"}
        </span>
        <span className="text-[var(--ink-faint)]">{open ? "▴" : "▾"}</span>
      </button>

      {isStaff ? (
        <div
          className="absolute left-1/2 flex -translate-x-1/2 rounded-md border border-[var(--line)] bg-white/70 p-0.5 text-xs sm:text-sm"
          role="group"
          aria-label="Bereich"
        >
          <button
            type="button"
            onClick={() => onSpaceChange("TEAM")}
            className={`rounded px-2.5 py-1 transition sm:px-3 ${
              space === "TEAM"
                ? "bg-[var(--sea)] font-medium text-white"
                : "text-[var(--ink-muted)] hover:text-[var(--ink)]"
            }`}
          >
            FB-Team
          </button>
          <button
            type="button"
            onClick={() => onSpaceChange("LEARNERS")}
            className={`rounded px-2.5 py-1 transition sm:px-3 ${
              space === "LEARNERS"
                ? "bg-[var(--sea)] font-medium text-white"
                : "text-[var(--ink-muted)] hover:text-[var(--ink)]"
            }`}
          >
            Lernende
          </button>
        </div>
      ) : (
        <span className="absolute left-1/2 -translate-x-1/2 text-xs tracking-wide text-[var(--ink-muted)] sm:text-sm">
          Lernende
        </span>
      )}

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
          onClick={handleShareLogin}
          className="flex h-8 items-center gap-1.5 rounded-md border border-[var(--line)] bg-white/70 px-2.5 text-sm text-[var(--ink)] transition hover:bg-black/5"
          title="Login-Link kopieren — auf anderem Gerät öffnen"
        >
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden
          >
            <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
            <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
          </svg>
          <span className="hidden sm:inline">Login teilen</span>
        </button>

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

      {shareNote &&
        createPortal(
          <div className="fixed inset-0 z-[120] flex items-center justify-center p-4">
            <div
              role="status"
              className="w-full max-w-sm rounded-xl border border-[var(--line)] bg-[var(--foam)] px-4 py-3 text-sm text-[var(--ink)] shadow-xl"
            >
              <p className="font-medium">Login-Link kopiert</p>
              <p className="mt-0.5 text-[var(--ink-muted)]">
                Auf dem anderen Gerät den Link öffnen — dort wird deine Kennung
                übernommen.
              </p>
            </div>
          </div>,
          document.body,
        )}

      {open &&
        createPortal(
          <button
            type="button"
            className="fixed inset-0 z-40 cursor-default bg-black/15"
            aria-label="Umfragen-Menü schliessen"
            onClick={() => setOpen(false)}
          />,
          document.body,
        )}

      {open && (
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
                  identity={identity}
                  isStaff={isStaff}
                  onSelect={(id) => {
                    onSelectSurvey(id);
                    setOpen(false);
                  }}
                  onDelete={requestDeleteSurvey}
                />
                <DropColumn
                  id="ARCHIVED"
                  title="Archiv"
                  surveys={archived}
                  currentSurveyId={currentSurveyId}
                  identity={identity}
                  isStaff={isStaff}
                  onSelect={(id) => {
                    onSelectSurvey(id);
                    setOpen(false);
                  }}
                  onDelete={requestDeleteSurvey}
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
      )}

      {createOpen &&
        createPortal(
          <div className="fixed inset-0 z-[100] flex items-end justify-center bg-black/40 p-3 sm:items-center sm:p-4">
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
          </div>,
          document.body,
        )}

      <ConfirmDialog
        open={!!deleteTarget}
        title="Umfrage löschen?"
        body={
          deleteTarget
            ? `„${deleteTarget.goal.slice(0, 160)}${deleteTarget.goal.length > 160 ? "…" : ""}“\n\nAlle Wind-, Anker- und Felsen-Einträge gehen unwiderruflich verloren.${deleteError ? `\n\n${deleteError}` : ""}`
            : ""
        }
        confirmLabel="Endgültig löschen"
        busy={deleteBusy}
        onCancel={() => {
          if (deleteBusy) return;
          setDeleteTarget(null);
          setDeleteError("");
        }}
        onConfirm={confirmDeleteSurvey}
      />
    </header>
  );
}
