import type { SiteRole, SurveySpace } from "@/lib/site-access";

export type { SiteRole, SurveySpace };

/** Server-only site gate secrets. Do not import from client components. */

const STAFF_PASSWORD =
  process.env.SITE_PASSWORD ?? "SantisSailorsAllStars";
const LEARNER_PASSWORD =
  process.env.SITE_LEARNER_PASSWORD ?? "SantisScrumSailors";

/** Opaque unlock tokens (not passwords). Keep stable for existing browsers. */
export const STAFF_UNLOCK_TOKEN =
  process.env.SITE_UNLOCK_TOKEN ?? "retrosail-unlocked-v1";
export const LEARNER_UNLOCK_TOKEN =
  process.env.SITE_LEARNER_UNLOCK_TOKEN ?? "retrosail-learner-v1";

export const ACCESS_COOKIE = "retrosail_access";
export const SPACE_COOKIE = "retrosail_space";

export function roleFromPassword(password: string): SiteRole | null {
  if (password === STAFF_PASSWORD) return "staff";
  if (password === LEARNER_PASSWORD) return "learner";
  return null;
}

export function roleFromToken(token: string | undefined | null): SiteRole | null {
  if (!token) return null;
  if (token === STAFF_UNLOCK_TOKEN) return "staff";
  if (token === LEARNER_UNLOCK_TOKEN) return "learner";
  return null;
}

export function unlockTokenForRole(role: SiteRole): string {
  return role === "staff" ? STAFF_UNLOCK_TOKEN : LEARNER_UNLOCK_TOKEN;
}

export function isStaffToken(token: string | undefined | null): boolean {
  return roleFromToken(token) === "staff";
}

/** Learners are locked to LEARNERS; staff may choose. */
export function resolveSpace(
  accessToken: string | undefined | null,
  requested: SurveySpace | undefined | null,
): SurveySpace | null {
  const role = roleFromToken(accessToken);
  if (!role) return null;
  if (role === "learner") return "LEARNERS";
  return requested === "LEARNERS" ? "LEARNERS" : "TEAM";
}
