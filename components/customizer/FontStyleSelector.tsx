"use client";

import { FONT_STYLE_OPTIONS, type FontStyleOption } from "@/types";

interface FontStyleSelectorProps {
  selectedId: string;
  onSelect: (id: string) => void;
}

export default function FontStyleSelector({
  selectedId,
  onSelect,
}: FontStyleSelectorProps) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-xs font-semibold text-[#0F172A] uppercase tracking-wider">
        Font
      </label>

      <div className="grid grid-cols-3 gap-1.5">
        {FONT_STYLE_OPTIONS.map((font) => {
          const isSelected = selectedId === font.id;
          return (
            <button
              key={font.id}
              type="button"
              onClick={() => onSelect(font.id)}
              title={font.description}
              className={`px-2 py-1.5 rounded-lg border text-center transition-all ${
                isSelected
                  ? "border-[#0F172A] bg-[#0F172A] text-white shadow-xs scale-[1.02]"
                  : "border-[#E2E8F0] bg-white hover:border-[#0F172A] text-[#0F172A] hover:bg-[#F8FAFC]"
              }`}
            >
              <div className="text-[11px] font-bold truncate leading-tight">
                {font.name}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

