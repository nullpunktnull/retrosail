import { NextResponse } from "next/server";

const SITE_PASSWORD =
  process.env.SITE_PASSWORD ?? "SantisSailorsAllStars";

/** Opaque unlock marker returned after a successful check (not the password). */
const UNLOCK_TOKEN =
  process.env.SITE_UNLOCK_TOKEN ?? "retrosail-unlocked-v1";

export async function POST(request: Request) {
  let password = "";
  try {
    const body = (await request.json()) as { password?: unknown };
    password = typeof body.password === "string" ? body.password : "";
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  if (password !== SITE_PASSWORD) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }

  return NextResponse.json({ ok: true, token: UNLOCK_TOKEN });
}
