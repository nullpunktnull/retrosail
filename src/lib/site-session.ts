import { cookies } from "next/headers";
import {
  ACCESS_COOKIE,
  SPACE_COOKIE,
  resolveSpace,
  roleFromToken,
  type SurveySpace,
} from "@/lib/site-access-server";

export async function readSiteSession(): Promise<{
  accessToken: string | null;
  role: "staff" | "learner" | null;
  space: SurveySpace | null;
}> {
  const jar = await cookies();
  const accessToken = jar.get(ACCESS_COOKIE)?.value ?? null;
  const role = roleFromToken(accessToken);
  const requested = jar.get(SPACE_COOKIE)?.value as SurveySpace | undefined;
  const space = resolveSpace(accessToken, requested);
  return { accessToken, role, space };
}
