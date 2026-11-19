// Staff login: one shared password per role (STAFF_PASSWORD, ADMIN_PASSWORD), and a session
// cookie "<role>.<expiryMs>.<hmac>" signed with NEXTAUTH_SECRET. Web Crypto only, so this runs
// in proxy.ts and in route handlers alike.
// shortcut: shared passwords, no per-person accounts; move to User rows + password hashes when
// you need to know who did what or lock out one person without changing everyone's password.

export type StaffRole = "staff" | "admin";

export const SESSION_COOKIE = "px_staff";
export const SESSION_MAX_AGE = 12 * 60 * 60; // seconds — one working day

const enc = new TextEncoder();

function signingKey(): Promise<CryptoKey> {
  const secret = process.env.NEXTAUTH_SECRET;
  if (!secret) throw new Error("NEXTAUTH_SECRET is not set");
  return crypto.subtle.importKey("raw", enc.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, [
    "sign",
    "verify",
  ]);
}

const toHex = (buf: ArrayBuffer) =>
  Array.from(new Uint8Array(buf), (b) => b.toString(16).padStart(2, "0")).join("");

const fromHex = (hex: string) => new Uint8Array(hex.match(/../g)!.map((h) => parseInt(h, 16)));

export async function createSession(role: StaffRole, now = Date.now()): Promise<string> {
  const payload = `${role}.${now + SESSION_MAX_AGE * 1000}`;
  const sig = await crypto.subtle.sign("HMAC", await signingKey(), enc.encode(payload));
  return `${payload}.${toHex(sig)}`;
}

/** Returns the role in a valid, unexpired session cookie, otherwise null. */
export async function readSession(token: string | undefined, now = Date.now()): Promise<StaffRole | null> {
  const [role, exp, sig, extra] = token?.split(".") ?? [];
  if (role !== "staff" && role !== "admin") return null;
  if (extra !== undefined || !/^\d+$/.test(exp ?? "") || !/^[0-9a-f]{64}$/.test(sig ?? "")) return null;
  if (Number(exp) < now) return null;
  const ok = await crypto.subtle.verify("HMAC", await signingKey(), fromHex(sig), enc.encode(`${role}.${exp}`));
  return ok ? role : null;
}

/**
 * Which role a request needs, or null if it is public. Inside the staff areas everything is
 * locked unless listed as public, so new routes there are protected by default.
 */
export function requiredRole(method: string, pathname: string): StaffRole | null {
  if (/^\/(admin|api\/admin)(\/|$)/.test(pathname)) return "admin";
  if (pathname === "/api/orders" && method === "POST") return null; // customer checkout
  // Customer tracking reads the DB directly (/track/[id]) with no personal data, so every
  // other orders API, including GET /api/orders/[id] (phone + address), is staff-only.
  if (/^\/(operator|api\/orders)(\/|$)/.test(pathname)) return "staff";
  return null;
}
