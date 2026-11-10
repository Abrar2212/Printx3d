"use client";

import type { FilamentColor } from "@/types";

interface ColorPickerProps {
  label?: string;
  sublabel?: string;
  colors: FilamentColor[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}

export default function ColorPicker({
  label = "Filament Material & Color",
  sublabel,
  colors,
  selectedId,
  onSelect,
}: ColorPickerProps) {
  const selectedColor = colors.find((c) => c.id === selectedId);

  return (
    <div className="flex flex-col gap-2">
      <div className="flex justify-between items-center">
        <div>
          <label className="text-xs font-semibold text-[#0F172A] uppercase tracking-wider block">
            {label}
          </label>
          {sublabel && (
            <span className="text-[11px] text-[#64748B] block mt-0.5">
              {sublabel}
            </span>
          )}
        </div>
        {selectedColor && (
          <span className="text-[11px] font-semibold text-[#059669] bg-[#059669]/10 px-2 py-0.5 rounded uppercase tracking-wider font-mono">
            {selectedColor.name}
          </span>
        )}
      </div>

      <div className="grid grid-cols-6 gap-1.5">
        {colors.map((color) => {
          const isSelected = selectedId === color.id;
          const isDark =
            color.hexCode === "#111111" ||
            color.hexCode === "#0047AB" ||
            color.hexCode === "#1a1a1a";

          return (
            <button
              key={color.id}
              type="button"
              onClick={() => color.inStock && onSelect(color.id)}
              disabled={!color.inStock}
              title={`${color.name} (${color.materialType}) - ${color.inStock ? "In Stock" : "Out of Stock"}`}
              className={`h-7 rounded-md border flex items-center justify-center relative transition-all ${
                isSelected
                  ? "border-[#0F172A] ring-2 ring-[#0F172A]/40 scale-105 shadow-xs z-10"
                  : "border-[#CBD5E1] hover:border-[#64748B]"
              } ${!color.inStock ? "opacity-25 cursor-not-allowed" : "cursor-pointer hover:scale-102"}`}
              style={{ backgroundColor: color.hexCode }}
            >
              {isSelected && (
                <span
                  className="w-1.5 h-1.5 rounded-full border shadow-xs"
                  style={{
                    backgroundColor: isDark ? "#FFFFFF" : "#0F172A",
                    borderColor: isDark ? "#E2E8F0" : "#1E293B",
                  }}
                />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
