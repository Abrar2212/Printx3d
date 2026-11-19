"use client";

import { useId } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faCheck } from "@fortawesome/free-solid-svg-icons";
import type { FilamentColor } from "@/types";

interface ColorPickerProps {
  label?: string;
  colors: FilamentColor[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}

// Perceived brightness, so the check mark stays visible on any swatch
function isLight(hex: string) {
  const n = parseInt(hex.replace("#", "").padEnd(6, "0").slice(0, 6), 16);
  return 0.299 * ((n >> 16) & 255) + 0.587 * ((n >> 8) & 255) + 0.114 * (n & 255) > 150;
}

export default function ColorPicker({ label = "Colour", colors, selectedId, onSelect }: ColorPickerProps) {
  const labelId = useId();
  const selectedColor = colors.find((c) => c.id === selectedId);

  return (
    <div role="group" aria-labelledby={labelId} className="space-y-2">
      <div className="flex justify-between items-baseline">
        <span id={labelId} className="text-sm font-semibold text-primary-navy">
          {label}
        </span>
        {selectedColor && <span className="text-sm text-secondary-slate">{selectedColor.name}</span>}
      </div>

      <div className="grid grid-cols-6 gap-2">
        {colors.map((color) => {
          const isSelected = selectedId === color.id;
          return (
            <button
              key={color.id}
              type="button"
              onClick={() => onSelect(color.id)}
              disabled={!color.inStock}
              aria-pressed={isSelected}
              aria-label={`${color.name}${color.inStock ? "" : " (out of stock)"}`}
              title={color.name}
              className={`h-10 rounded-lg border flex items-center justify-center transition-shadow cursor-pointer disabled:opacity-25 disabled:cursor-not-allowed focus-visible:outline-none ${
                isSelected
                  ? "border-primary-navy ring-2 ring-offset-2 ring-primary-navy"
                  : "border-black/10 hover:ring-2 hover:ring-offset-1 hover:ring-border-subtle focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-primary-navy/40"
              }`}
              style={{ backgroundColor: color.hexCode }}
            >
              {isSelected && (
                <FontAwesomeIcon
                  icon={faCheck}
                  className={`text-xs ${isLight(color.hexCode) ? "text-primary-navy" : "text-white"}`}
                />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
