"use client";

import { useState } from "react";
import { MAX_LINE_CHARS, MAX_LINES } from "@/lib/keychain-text";

interface TextInputProps {
  value: string;
  onChange: (value: string) => void;
  /** Lines allowed for the selected product (admin "Lines" setting). */
  maxLines?: number;
}

// Keep at most `maxLines` lines of 12 characters (also catches pasted text).
const limit = (raw: string, maxLines: number) =>
  raw
    .split(/\r?\n/)
    .slice(0, maxLines)
    .map((l) => l.slice(0, MAX_LINE_CHARS))
    .join("\n");

export default function TextInput({ value, onChange, maxLines = MAX_LINES }: TextInputProps) {
  const [caretLine, setCaretLine] = useState(0);
  const lines = value.split("\n");
  const current = Math.min(caretLine, lines.length - 1);

  const trackCaret = (el: HTMLTextAreaElement) =>
    setCaretLine(el.value.slice(0, el.selectionStart).split("\n").length - 1);

  return (
    <div className="space-y-2">
      <div className="flex justify-between items-baseline">
        <label htmlFor="keychain-name" className="text-sm font-semibold text-primary-navy">
          Name
        </label>
        <span className="text-xs text-secondary-slate tabular-nums" aria-live="polite">
          {maxLines > 1 && `Line ${current + 1} · `}
          {lines[current]?.length ?? 0}/{MAX_LINE_CHARS}
        </span>
      </div>
      <textarea
        id="keychain-name"
        value={value}
        rows={lines.length}
        aria-describedby="keychain-name-hint"
        onKeyDown={(e) => {
          const el = e.currentTarget;
          const noSelection = el.selectionStart === el.selectionEnd;
          if (e.key === "Enter" && lines.length >= maxLines) e.preventDefault();
          // stop typing once the current line is full (paste is trimmed in onChange)
          if (e.key.length === 1 && !e.ctrlKey && !e.metaKey && noSelection && (lines[current]?.length ?? 0) >= MAX_LINE_CHARS)
            e.preventDefault();
        }}
        onChange={(e) => {
          onChange(limit(e.target.value, maxLines));
          trackCaret(e.target);
        }}
        onSelect={(e) => trackCaret(e.currentTarget)}
        placeholder="Type a name"
        autoComplete="off"
        spellCheck={false}
        enterKeyHint={lines.length < maxLines ? "enter" : "done"}
        className="w-full min-h-12 px-4 py-3 rounded-xl bg-surface border border-border-subtle text-primary-navy placeholder:text-muted text-base leading-6 resize-none focus:outline-none focus:border-primary-navy focus:ring-4 focus:ring-primary-navy/10 transition-colors"
      />
      <p id="keychain-name-hint" className="text-xs text-secondary-slate">
        {maxLines > 1
          ? `Up to ${maxLines} lines, ${MAX_LINE_CHARS} characters each. Press Enter for a new line.`
          : `Up to ${MAX_LINE_CHARS} characters.`}
      </p>
    </div>
  );
}
