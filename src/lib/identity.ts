export type EntryType = "WIND" | "ANCHOR" | "ROCK";
export type SurveyStatus = "ACTIVE" | "ARCHIVED";
export type SurveySpace = "TEAM" | "LEARNERS";

export type EntryDTO = {
  id: string;
  surveyId: string;
  type: EntryType;
  authorName: string;
  authorToken: string;
  content: string;
  createdAt: string;
  updatedAt: string;
};

export type SurveyDTO = {
  id: string;
  goal: string;
  creatorToken: string;
  status: SurveyStatus;
  space: SurveySpace;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
  entries: EntryDTO[];
};

export type SurveySummary = {
  id: string;
  goal: string;
  creatorToken: string;
  status: SurveyStatus;
  space: SurveySpace;
  sortOrder: number;
  createdAt: string;
  entryCount: number;
};

const IDENTITY_KEY = "retrosail_identity";
const NAME_KEY = "retrosail_name";

function randomToken(): string {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return `rs_${Math.random().toString(36).slice(2)}_${Date.now().toString(36)}`;
}

export function getOrCreateIdentity(): string {
  if (typeof window === "undefined") return "";
  let token = localStorage.getItem(IDENTITY_KEY);
  if (!token) {
    token = randomToken();
    localStorage.setItem(IDENTITY_KEY, token);
  }
  return token;
}

export function setIdentity(token: string): void {
  if (typeof window === "undefined") return;
  const cleaned = token.trim();
  if (!cleaned) return;
  localStorage.setItem(IDENTITY_KEY, cleaned);
}

export function getStoredName(): string {
  if (typeof window === "undefined") return "";
  return localStorage.getItem(NAME_KEY) ?? "";
}

export function setStoredName(name: string): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(NAME_KEY, name);
}

/** Link that installs this browser's identity on another device. */
export function buildShareLoginUrl(origin = window.location.origin): string {
  const token = getOrCreateIdentity();
  const name = getStoredName().trim();
  const url = new URL("/claim", origin);
  url.searchParams.set("t", token);
  if (name) url.searchParams.set("n", name);
  return url.toString();
}

export function canEditEntry(
  entry: { authorToken: string },
  survey: { creatorToken: string; space: SurveySpace },
  identity: string,
  isStaff = false,
): boolean {
  // Staff override only in Lernende space — FB-Team keeps author/creator rules
  if (isStaff && survey.space === "LEARNERS") return true;
  if (!identity) return false;
  return entry.authorToken === identity || survey.creatorToken === identity;
}

export function canEditSurvey(
  survey: { creatorToken: string; space: SurveySpace },
  identity: string,
  isStaff = false,
): boolean {
  if (isStaff && survey.space === "LEARNERS") return true;
  if (!identity) return false;
  return survey.creatorToken === identity;
}
