import { NextResponse } from "next/server";
import {
  ACCESS_COOKIE,
  SPACE_COOKIE,
  roleFromPassword,
  unlockTokenForRole,
} from "@/lib/site-access-server";

const COOKIE_MAX_AGE = 60 * 60 * 24 * 365 * 5;

export async function POST(request: Request) {
  let password = "";
  try {
    const body = (await request.json()) as { password?: unknown };
    password = typeof body.password === "string" ? body.password : "";
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  const role = roleFromPassword(password);
  if (!role) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }

  const token = unlockTokenForRole(role);
  const space = role === "learner" ? "LEARNERS" : "TEAM";

  const res = NextResponse.json({ ok: true, role, token, space });
  res.cookies.set(ACCESS_COOKIE, token, {
    path: "/",
    maxAge: COOKIE_MAX_AGE,
    sameSite: "lax",
    httpOnly: false,
  });
  res.cookies.set(SPACE_COOKIE, space, {
    path: "/",
    maxAge: COOKIE_MAX_AGE,
    sameSite: "lax",
    httpOnly: false,
  });
  return res;
}
