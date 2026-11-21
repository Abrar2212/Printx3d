"use client";

import type { Style } from "@/types";

interface StyleSelectorProps {
  styles: Style[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  currency?: string;
}

export default function StyleSelector({ styles, selectedId, onSelect, currency = "৳" }: StyleSelectorProps) {
  if (styles.length <= 1) return null; // nothing to choose

  return (
    <div role="radiogroup" aria-labelledby="style-label" className="space-y-2">
      <span id="style-label" className="block text-sm font-semibold text-primary-navy">
        Type
      </span>
      <div className="space-y-2">
        {styles.map((style) => {
          const isSelected = selectedId === style.id;
          return (
            <button
              key={style.id}
              type="button"
              role="radio"
              aria-checked={isSelected}
              onClick={() => onSelect(style.id)}
              className={`w-full min-h-12 px-4 rounded-xl border text-left flex items-center justify-between gap-3 transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-navy/30 ${
                isSelected ? "border-primary-navy bg-primary-navy/[0.03]" : "border-border hover:border-border-subtle"
              }`}
            >
              <span className="flex items-center gap-3">
                <span
                  className={`w-4 h-4 rounded-full border-2 ${
                    isSelected ? "border-primary-navy bg-primary-navy shadow-[inset_0_0_0_2px_white]" : "border-border-subtle"
                  }`}
                />
                <span className="text-sm font-medium text-primary-navy">{style.name}</span>
              </span>
              <span className="text-sm font-semibold text-primary-navy tabular-nums">
                {currency}
                {style.basePrice.toFixed(2)}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
