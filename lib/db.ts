import { PrismaClient } from "@prisma/client";

// ─── Singleton pattern for Next.js hot-reload safety ──────────
// In development, Next.js module system reloads frequently.
// Without this pattern, each reload creates a new DB connection pool.

declare global {
  // eslint-disable-next-line no-var
  var prisma: PrismaClient | undefined;
}

export const db: PrismaClient =
  global.prisma ??
  new PrismaClient({
    log:
      process.env.NODE_ENV === "development"
        ? ["query", "error", "warn"]
        : ["error"],
  });

if (process.env.NODE_ENV !== "production") {
  global.prisma = db;
}

