export type SiteRole = "staff" | "learner";
export type SurveySpace = "TEAM" | "LEARNERS";

export const GATE_TOKEN_KEY = "retrosail_site_unlocked";
export const GATE_ROLE_KEY = "retrosail_site_role";
export const SPACE_KEY = "retrosail_space";

export function getSiteAccessToken(): string {
  if (typeof window === "undefined") return "";
  return localStorage.getItem(GATE_TOKEN_KEY) ?? "";
}

export function getSiteRole(): SiteRole | null {
  if (typeof window === "undefined") return null;
  const role = localStorage.getItem(GATE_ROLE_KEY);
  if (role === "staff" || role === "learner") return role;
  // Legacy unlock without role → treat as staff
  if (localStorage.getItem(GATE_TOKEN_KEY)) return "staff";
  return null;
}

export function setSiteAccess(role: SiteRole, token: string): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(GATE_TOKEN_KEY, token);
  localStorage.setItem(GATE_ROLE_KEY, role);
  const space: SurveySpace =
    role === "learner" ? "LEARNERS" : getStoredSpace() ?? "TEAM";
  setActiveSpace(space);
}

export function getStoredSpace(): SurveySpace | null {
  if (typeof window === "undefined") return null;
  const space = localStorage.getItem(SPACE_KEY);
  if (space === "TEAM" || space === "LEARNERS") return space;
  return null;
}

export function getActiveSpace(
  role: SiteRole | null = getSiteRole(),
): SurveySpace {
  if (role === "learner") return "LEARNERS";
  return getStoredSpace() ?? "TEAM";
}

export function setActiveSpace(space: SurveySpace): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(SPACE_KEY, space);
  const maxAge = 60 * 60 * 24 * 365 * 5;
  document.cookie = `retrosail_space=${space}; path=/; max-age=${maxAge}; SameSite=Lax`;
}

export function syncAccessCookie(token: string): void {
  if (typeof window === "undefined") return;
  const maxAge = 60 * 60 * 24 * 365 * 5;
  document.cookie = `retrosail_access=${encodeURIComponent(token)}; path=/; max-age=${maxAge}; SameSite=Lax`;
}
