// Text rules shared by the customizer input, the order API and the 3D geometry.
// Kept free of three.js so the API and form can import it cheaply.

export const MAX_LINES = 3; // hard cap; the admin "Lines" setting (style config maxLines) can lower it
export const MAX_LINE_CHARS = 12;

/** The admin-chosen line limit for a style, clamped to 1–3 (default 3). */
export function lineLimit(config: unknown): number {
  const n = Number((config as { maxLines?: unknown } | null)?.maxLines);
  return Number.isInteger(n) ? Math.min(Math.max(n, 1), MAX_LINES) : MAX_LINES;
}

/** Clean customer text: up to `maxLines` non-empty lines of at most 12 characters each. */
export function keychainText(text: string, maxLines = MAX_LINES): string {
  const lines = text
    .split(/\r?\n/)
    .map((l) => l.trim().slice(0, MAX_LINE_CHARS))
    .filter(Boolean)
    .slice(0, Math.min(Math.max(1, maxLines), MAX_LINES));
  return lines.join("\n") || "KEY";
}

/** One-line version for lists and summaries: "Imran / Hossain". */
export const oneLine = (text: string) => text.split(/\r?\n/).filter(Boolean).join(" / ");
