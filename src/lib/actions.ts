"use server";

import { revalidatePath } from "next/cache";
import { EntryType, SurveyStatus } from "@prisma/client";
import { prisma } from "./prisma";
import type { EntryDTO, SurveyDTO, SurveySummary } from "./identity";

function toEntryDTO(entry: {
  id: string;
  surveyId: string;
  type: EntryType;
  authorName: string;
  authorToken: string;
  content: string;
  createdAt: Date;
  updatedAt: Date;
}): EntryDTO {
  return {
    id: entry.id,
    surveyId: entry.surveyId,
    type: entry.type,
    authorName: entry.authorName,
    authorToken: entry.authorToken,
    content: entry.content,
    createdAt: entry.createdAt.toISOString(),
    updatedAt: entry.updatedAt.toISOString(),
  };
}

function toSurveyDTO(survey: {
  id: string;
  goal: string;
  creatorToken: string;
  status: SurveyStatus;
  sortOrder: number;
  createdAt: Date;
  updatedAt: Date;
  entries: Array<{
    id: string;
    surveyId: string;
    type: EntryType;
    authorName: string;
    authorToken: string;
    content: string;
    createdAt: Date;
    updatedAt: Date;
  }>;
}): SurveyDTO {
  return {
    id: survey.id,
    goal: survey.goal,
    creatorToken: survey.creatorToken,
    status: survey.status,
    sortOrder: survey.sortOrder,
    createdAt: survey.createdAt.toISOString(),
    updatedAt: survey.updatedAt.toISOString(),
    entries: survey.entries.map(toEntryDTO),
  };
}

export async function listSurveys(): Promise<SurveySummary[]> {
  const surveys = await prisma.survey.findMany({
    orderBy: [{ status: "asc" }, { sortOrder: "asc" }, { createdAt: "desc" }],
    include: { _count: { select: { entries: true } } },
  });

  return surveys.map((s) => ({
    id: s.id,
    goal: s.goal,
    creatorToken: s.creatorToken,
    status: s.status,
    sortOrder: s.sortOrder,
    createdAt: s.createdAt.toISOString(),
    entryCount: s._count.entries,
  }));
}

export async function getSurvey(id: string): Promise<SurveyDTO | null> {
  const survey = await prisma.survey.findUnique({
    where: { id },
    include: { entries: { orderBy: { createdAt: "asc" } } },
  });
  if (!survey) return null;
  return toSurveyDTO(survey);
}

export async function getLatestActiveSurvey(): Promise<SurveyDTO | null> {
  const survey = await prisma.survey.findFirst({
    where: { status: "ACTIVE" },
    orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }],
    include: { entries: { orderBy: { createdAt: "asc" } } },
  });
  if (!survey) return null;
  return toSurveyDTO(survey);
}

export async function createSurvey(input: {
  goal: string;
  creatorToken: string;
}): Promise<{ ok: true; survey: SurveyDTO } | { ok: false; error: string }> {
  const goal = input.goal.trim();
  if (!goal) return { ok: false, error: "Bitte ein Ziel angeben." };
  if (!input.creatorToken.trim()) {
    return { ok: false, error: "Identität fehlt." };
  }

  const maxOrder = await prisma.survey.aggregate({
    where: { status: "ACTIVE" },
    _max: { sortOrder: true },
  });

  const survey = await prisma.survey.create({
    data: {
      goal,
      creatorToken: input.creatorToken.trim(),
      status: "ACTIVE",
      sortOrder: (maxOrder._max.sortOrder ?? -1) + 1,
    },
    include: { entries: true },
  });

  revalidatePath("/");
  return { ok: true, survey: toSurveyDTO(survey) };
}

export async function updateSurveyGoal(input: {
  surveyId: string;
  goal: string;
  identityToken: string;
}): Promise<{ ok: true; survey: SurveyDTO } | { ok: false; error: string }> {
  const survey = await prisma.survey.findUnique({ where: { id: input.surveyId } });
  if (!survey) return { ok: false, error: "Umfrage nicht gefunden." };
  if (survey.creatorToken !== input.identityToken) {
    return { ok: false, error: "Nur der Ersteller darf das Ziel ändern." };
  }

  const goal = input.goal.trim();
  if (!goal) return { ok: false, error: "Bitte ein Ziel angeben." };

  const updated = await prisma.survey.update({
    where: { id: input.surveyId },
    data: { goal },
    include: { entries: { orderBy: { createdAt: "asc" } } },
  });

  revalidatePath("/");
  return { ok: true, survey: toSurveyDTO(updated) };
}

export async function deleteSurvey(input: {
  surveyId: string;
  identityToken: string;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const survey = await prisma.survey.findUnique({ where: { id: input.surveyId } });
  if (!survey) return { ok: false, error: "Umfrage nicht gefunden." };
  if (survey.creatorToken !== input.identityToken) {
    return { ok: false, error: "Nur der Ersteller darf die Umfrage löschen." };
  }

  await prisma.survey.delete({ where: { id: input.surveyId } });
  revalidatePath("/");
  return { ok: true };
}

export async function reorderSurveys(input: {
  activeIds: string[];
  archivedIds: string[];
}): Promise<{ ok: true } | { ok: false; error: string }> {
  await prisma.$transaction([
    ...input.activeIds.map((id, index) =>
      prisma.survey.update({
        where: { id },
        data: { status: "ACTIVE", sortOrder: index },
      }),
    ),
    ...input.archivedIds.map((id, index) =>
      prisma.survey.update({
        where: { id },
        data: { status: "ARCHIVED", sortOrder: index },
      }),
    ),
  ]);

  revalidatePath("/");
  return { ok: true };
}

export async function createEntry(input: {
  surveyId: string;
  type: EntryType;
  authorName: string;
  authorToken: string;
  content: string;
}): Promise<{ ok: true; entry: EntryDTO } | { ok: false; error: string }> {
  const content = input.content.trim();
  const authorName = input.authorName.trim();
  if (!authorName) return { ok: false, error: "Bitte deinen Namen angeben." };
  if (!content) return { ok: false, error: "Bitte einen Kommentar eingeben." };
  if (!input.authorToken.trim()) return { ok: false, error: "Identität fehlt." };

  const survey = await prisma.survey.findUnique({ where: { id: input.surveyId } });
  if (!survey) return { ok: false, error: "Umfrage nicht gefunden." };

  const entry = await prisma.entry.create({
    data: {
      surveyId: input.surveyId,
      type: input.type,
      authorName,
      authorToken: input.authorToken.trim(),
      content,
    },
  });

  revalidatePath("/");
  return { ok: true, entry: toEntryDTO(entry) };
}

export async function updateEntry(input: {
  entryId: string;
  identityToken: string;
  authorName?: string;
  content?: string;
}): Promise<{ ok: true; entry: EntryDTO } | { ok: false; error: string }> {
  const entry = await prisma.entry.findUnique({
    where: { id: input.entryId },
    include: { survey: true },
  });
  if (!entry) return { ok: false, error: "Eintrag nicht gefunden." };

  const isAuthor = entry.authorToken === input.identityToken;
  const isCreator = entry.survey.creatorToken === input.identityToken;
  if (!isAuthor && !isCreator) {
    return { ok: false, error: "Keine Berechtigung zum Bearbeiten." };
  }

  const data: { authorName?: string; content?: string } = {};
  if (input.authorName !== undefined) {
    const name = input.authorName.trim();
    if (!name) return { ok: false, error: "Bitte deinen Namen angeben." };
    data.authorName = name;
  }
  if (input.content !== undefined) {
    const content = input.content.trim();
    if (!content) return { ok: false, error: "Bitte einen Kommentar eingeben." };
    data.content = content;
  }

  const updated = await prisma.entry.update({
    where: { id: input.entryId },
    data,
  });

  revalidatePath("/");
  return { ok: true, entry: toEntryDTO(updated) };
}

export async function deleteEntry(input: {
  entryId: string;
  identityToken: string;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const entry = await prisma.entry.findUnique({
    where: { id: input.entryId },
    include: { survey: true },
  });
  if (!entry) return { ok: false, error: "Eintrag nicht gefunden." };

  const isAuthor = entry.authorToken === input.identityToken;
  const isCreator = entry.survey.creatorToken === input.identityToken;
  if (!isAuthor && !isCreator) {
    return { ok: false, error: "Keine Berechtigung zum Löschen." };
  }

  await prisma.entry.delete({ where: { id: input.entryId } });
  revalidatePath("/");
  return { ok: true };
}

export async function searchAll(query: string): Promise<{
  surveys: SurveySummary[];
  entries: Array<EntryDTO & { surveyGoal: string }>;
}> {
  const q = query.trim();
  if (!q) return { surveys: [], entries: [] };

  const [surveys, entries] = await Promise.all([
    prisma.survey.findMany({
      where: { goal: { contains: q } },
      include: { _count: { select: { entries: true } } },
      orderBy: { updatedAt: "desc" },
      take: 20,
    }),
    prisma.entry.findMany({
      where: {
        OR: [
          { content: { contains: q } },
          { authorName: { contains: q } },
        ],
      },
      include: { survey: { select: { goal: true } } },
      orderBy: { updatedAt: "desc" },
      take: 40,
    }),
  ]);

  return {
    surveys: surveys.map((s) => ({
      id: s.id,
      goal: s.goal,
      creatorToken: s.creatorToken,
      status: s.status,
      sortOrder: s.sortOrder,
      createdAt: s.createdAt.toISOString(),
      entryCount: s._count.entries,
    })),
    entries: entries.map((e) => ({
      ...toEntryDTO(e),
      surveyGoal: e.survey.goal,
    })),
  };
}
