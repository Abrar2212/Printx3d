import { createHash, timingSafeEqual } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { createSession, SESSION_COOKIE, SESSION_MAX_AGE, type StaffRole } from "@/lib/auth";

// Compare hashes so the comparison takes the same time whatever the input length.
function matches(input: string, expected: string | undefined): boolean {
  if (!expected) return false; // an unset password never matches, not even ""
  const a = createHash("sha256").update(input).digest();
  const b = createHash("sha256").update(expected).digest();
  return timingSafeEqual(a, b);
}

// ─── POST: log in ─────────────────────────────────────────────
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const password = typeof body?.password === "string" ? body.password.slice(0, 200) : "";

  const role: StaffRole | null = matches(password, process.env.ADMIN_PASSWORD)
    ? "admin"
    : matches(password, process.env.STAFF_PASSWORD)
      ? "staff"
      : null;

  if (!role) {
    await new Promise((r) => setTimeout(r, 600)); // slows down password guessing
    return NextResponse.json({ error: "Wrong password" }, { status: 401 });
  }

  const res = NextResponse.json({ role });
  res.cookies.set(SESSION_COOKIE, await createSession(role), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_MAX_AGE,
  });
  return res;
}

// ─── DELETE: log out ──────────────────────────────────────────
export async function DELETE() {
  const res = NextResponse.json({ ok: true });
  res.cookies.delete(SESSION_COOKIE);
  return res;
}
