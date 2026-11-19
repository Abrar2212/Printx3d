// Run: npx tsx --test lib/auth.test.ts
import { test } from "node:test";
import assert from "node:assert/strict";
import { createSession, readSession, requiredRole, SESSION_MAX_AGE } from "./auth";

process.env.NEXTAUTH_SECRET = "test-secret";

test("access rules", () => {
  const cases: [string, string, string | null][] = [
    ["GET", "/admin", "admin"],
    ["GET", "/admin/inventory", "admin"],
    ["POST", "/api/admin/filaments", "admin"],
    ["PATCH", "/api/admin/styles/abc", "admin"],
    ["GET", "/operator", "staff"],
    ["GET", "/api/orders", "staff"], // full order list with customer details
    ["PATCH", "/api/orders/abc", "staff"],
    ["GET", "/api/orders/abc/stl", "staff"],
    ["GET", "/api/orders/abc/anything-new", "staff"], // locked by default
    ["POST", "/api/orders", null], // checkout
    ["GET", "/api/orders/abc", "staff"], // returns phone + address; tracking page doesn't use it
    ["GET", "/", null],
    ["GET", "/administrator", null], // prefix match must stop at a path boundary
  ];
  for (const [method, path, want] of cases) {
    assert.equal(requiredRole(method, path), want, `${method} ${path}`);
  }
});

test("session cookie round-trip, tampering and expiry", async () => {
  const now = 1_700_000_000_000;
  const staff = await createSession("staff", now);
  assert.equal(await readSession(staff, now), "staff");
  assert.equal(await readSession(await createSession("admin", now), now), "admin");

  assert.equal(await readSession(staff.replace(/^staff/, "admin"), now), null, "role swap");
  assert.equal(await readSession(staff.slice(0, -1) + (staff.endsWith("0") ? "1" : "0"), now), null, "bad sig");
  assert.equal(await readSession(staff, now + SESSION_MAX_AGE * 1000 + 1), null, "expired");
  assert.equal(await readSession(undefined, now), null);
  assert.equal(await readSession("garbage", now), null);

  process.env.NEXTAUTH_SECRET = "other-secret";
  assert.equal(await readSession(staff, now), null, "different secret");
});
