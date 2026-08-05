"use server";

import { revalidatePath } from "next/cache";
import { EntryType, SurveyStatus, type SurveySpace } from "@prisma/client";
import { prisma } from "./prisma";
import type { EntryDTO, SurveyDTO, SurveySummary } from "./identity";
import {
  isStaffToken,
  resolveSpace,
  roleFromToken,
} from "./site-access-server";

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
  space: SurveySpace;
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
    space: survey.space,
    sortOrder: survey.sortOrder,
    createdAt: survey.createdAt.toISOString(),
    updatedAt: survey.updatedAt.toISOString(),
    entries: survey.entries.map(toEntryDTO),
  };
}

function toSummary(
  s: {
    id: string;
    goal: string;
    creatorToken: string;
    status: SurveyStatus;
    space: SurveySpace;
    sortOrder: number;
    createdAt: Date;
    _count: { entries: number };
  },
): SurveySummary {
  return {
    id: s.id,
    goal: s.goal,
    creatorToken: s.creatorToken,
    status: s.status,
    space: s.space,
    sortOrder: s.sortOrder,
    createdAt: s.createdAt.toISOString(),
    entryCount: s._count.entries,
  };
}

function canManageSurvey(
  survey: { creatorToken: string },
  identityToken: string,
  accessToken?: string,
): boolean {
  if (isStaffToken(accessToken)) return true;
  return survey.creatorToken === identityToken;
}

function canManageEntry(
  entry: { authorToken: string },
  survey: { creatorToken: string },
  identityToken: string,
  accessToken?: string,
): boolean {
  if (isStaffToken(accessToken)) return true;
  return (
    entry.authorToken === identityToken ||
    survey.creatorToken === identityToken
  );
}

export async function listSurveys(input?: {
  space?: SurveySpace;
  accessToken?: string;
}): Promise<SurveySummary[]> {
  const space = resolveSpace(input?.accessToken, input?.space);
  if (!space) return [];

  const surveys = await prisma.survey.findMany({
    where: { space },
    orderBy: [{ status: "asc" }, { sortOrder: "asc" }, { createdAt: "desc" }],
    include: { _count: { select: { entries: true } } },
  });

  return surveys.map(toSummary);
}

export async function getSurvey(
  id: string,
  accessToken?: string,
): Promise<SurveyDTO | null> {
  const survey = await prisma.survey.findUnique({
    where: { id },
    include: { entries: { orderBy: { createdAt: "asc" } } },
  });
  if (!survey) return null;

  const role = roleFromToken(accessToken);
  if (!role) return null;
  if (role === "learner" && survey.space === "TEAM") return null;

  return toSurveyDTO(survey);
}

export async function getLatestActiveSurvey(input?: {
  space?: SurveySpace;
  accessToken?: string;
}): Promise<SurveyDTO | null> {
  const space = resolveSpace(input?.accessToken, input?.space);
  if (!space) return null;

  const survey = await prisma.survey.findFirst({
    where: { status: "ACTIVE", space },
    orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }],
    include: { entries: { orderBy: { createdAt: "asc" } } },
  });
  if (!survey) return null;
  return toSurveyDTO(survey);
}

export async function createSurvey(input: {
  goal: string;
  creatorToken: string;
  space?: SurveySpace;
  accessToken?: string;
}): Promise<{ ok: true; survey: SurveyDTO } | { ok: false; error: string }> {
  const goal = input.goal.trim();
  if (!goal) return { ok: false, error: "Bitte ein Ziel angeben." };
  if (!input.creatorToken.trim()) {
    return { ok: false, error: "Identität fehlt." };
  }

  const space = resolveSpace(input.accessToken, input.space);
  if (!space) return { ok: false, error: "Keine Berechtigung." };

  const maxOrder = await prisma.survey.aggregate({
    where: { status: "ACTIVE", space },
    _max: { sortOrder: true },
  });

  const survey = await prisma.survey.create({
    data: {
      goal,
      creatorToken: input.creatorToken.trim(),
      status: "ACTIVE",
      space,
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
  accessToken?: string;
}): Promise<{ ok: true; survey: SurveyDTO } | { ok: false; error: string }> {
  const survey = await prisma.survey.findUnique({ where: { id: input.surveyId } });
  if (!survey) return { ok: false, error: "Umfrage nicht gefunden." };
  if (!canManageSurvey(survey, input.identityToken, input.accessToken)) {
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
  accessToken?: string;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const survey = await prisma.survey.findUnique({ where: { id: input.surveyId } });
  if (!survey) return { ok: false, error: "Umfrage nicht gefunden." };
  if (!canManageSurvey(survey, input.identityToken, input.accessToken)) {
    return { ok: false, error: "Nur der Ersteller darf die Umfrage löschen." };
  }

  await prisma.survey.delete({ where: { id: input.surveyId } });
  revalidatePath("/");
  return { ok: true };
}

export async function reorderSurveys(input: {
  activeIds: string[];
  archivedIds: string[];
  space?: SurveySpace;
  accessToken?: string;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const space = resolveSpace(input.accessToken, input.space);
  if (!space) return { ok: false, error: "Keine Berechtigung." };

  const ids = [...input.activeIds, ...input.archivedIds];
  if (ids.length > 0) {
    const owned = await prisma.survey.count({
      where: { id: { in: ids }, space },
    });
    if (owned !== ids.length) {
      return { ok: false, error: "Ungültige Umfragen für diesen Bereich." };
    }
  }

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
  accessToken?: string;
}): Promise<{ ok: true; entry: EntryDTO } | { ok: false; error: string }> {
  const content = input.content.trim();
  const authorName = input.authorName.trim();
  if (!authorName) return { ok: false, error: "Bitte deinen Namen angeben." };
  if (!content) return { ok: false, error: "Bitte einen Kommentar eingeben." };
  if (!input.authorToken.trim()) return { ok: false, error: "Identität fehlt." };

  const survey = await prisma.survey.findUnique({ where: { id: input.surveyId } });
  if (!survey) return { ok: false, error: "Umfrage nicht gefunden." };

  const role = roleFromToken(input.accessToken);
  if (!role) return { ok: false, error: "Keine Berechtigung." };
  if (role === "learner" && survey.space === "TEAM") {
    return { ok: false, error: "Keine Berechtigung." };
  }

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
  accessToken?: string;
}): Promise<{ ok: true; entry: EntryDTO } | { ok: false; error: string }> {
  const entry = await prisma.entry.findUnique({
    where: { id: input.entryId },
    include: { survey: true },
  });
  if (!entry) return { ok: false, error: "Eintrag nicht gefunden." };

  if (
    !canManageEntry(entry, entry.survey, input.identityToken, input.accessToken)
  ) {
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
  accessToken?: string;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const entry = await prisma.entry.findUnique({
    where: { id: input.entryId },
    include: { survey: true },
  });
  if (!entry) return { ok: false, error: "Eintrag nicht gefunden." };

  if (
    !canManageEntry(entry, entry.survey, input.identityToken, input.accessToken)
  ) {
    return { ok: false, error: "Keine Berechtigung zum Löschen." };
  }

  await prisma.entry.delete({ where: { id: input.entryId } });
  revalidatePath("/");
  return { ok: true };
}

export async function searchAll(
  query: string,
  input?: { space?: SurveySpace; accessToken?: string },
): Promise<{
  surveys: SurveySummary[];
  entries: Array<EntryDTO & { surveyGoal: string }>;
}> {
  const space = resolveSpace(input?.accessToken, input?.space);
  if (!space) return { surveys: [], entries: [] };

  const q = query.trim();
  if (!q) return { surveys: [], entries: [] };

  const [surveys, entries] = await Promise.all([
    prisma.survey.findMany({
      where: { space, goal: { contains: q } },
      include: { _count: { select: { entries: true } } },
      orderBy: { updatedAt: "desc" },
      take: 20,
    }),
    prisma.entry.findMany({
      where: {
        survey: { space },
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
    surveys: surveys.map(toSummary),
    entries: entries.map((e) => ({
      ...toEntryDTO(e),
      surveyGoal: e.survey.goal,
    })),
  };
}
