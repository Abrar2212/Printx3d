"use client";

import { FONT_STYLE_OPTIONS } from "@/types";

interface FontStyleSelectorProps {
  selectedId: string;
  onSelect: (id: string) => void;
}

export default function FontStyleSelector({ selectedId, onSelect }: FontStyleSelectorProps) {
  return (
    <div role="group" aria-labelledby="font-label" className="space-y-2">
      <span id="font-label" className="block text-sm font-semibold text-primary-navy">
        Font
      </span>
      <div className="grid grid-cols-3 gap-2">
        {FONT_STYLE_OPTIONS.map((font) => {
          const isSelected = selectedId === font.id;
          return (
            <button
              key={font.id}
              type="button"
              onClick={() => onSelect(font.id)}
              aria-pressed={isSelected}
              title={font.description}
              className={`h-11 px-2 rounded-lg border text-sm font-medium truncate transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-navy/30 ${
                isSelected
                  ? "border-primary-navy bg-primary-navy text-white"
                  : "border-border bg-surface text-primary-navy hover:border-border-subtle hover:bg-bg"
              }`}
            >
              {font.name}
            </button>
          );
        })}
      </div>
    </div>
  );
}
