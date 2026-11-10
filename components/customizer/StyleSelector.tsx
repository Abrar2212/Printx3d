"use client";

import type { Style } from "@/types";

interface StyleSelectorProps {
  styles: Style[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}

export default function StyleSelector({
  styles,
  selectedId,
  onSelect,
}: StyleSelectorProps) {
  return (
    <div className="flex flex-col gap-2">
      <label className="text-sm font-medium text-[#0F172A]">
        Base Spec & Form Factor
      </label>
      <div className="grid grid-cols-1 gap-2.5">
        {styles.map((style) => {
          const isSelected = selectedId === style.id;
          return (
            <button
              key={style.id}
              type="button"
              onClick={() => onSelect(style.id)}
              className={`p-3 rounded-lg border text-left flex items-center justify-between transition-all ${
                isSelected
                  ? "border-[#0F172A] bg-[#0F172A]/[0.02] shadow-sm ring-1 ring-[#0F172A]"
                  : "border-[#E2E8F0] bg-white hover:border-[#CBD5E1] hover:bg-[#F8FAFC]"
              }`}
            >
              <div className="flex items-center gap-2.5">
                <span
                  className={`w-4 h-4 rounded-full border flex items-center justify-center transition-all ${
                    isSelected
                      ? "border-[#0F172A] bg-[#0F172A]"
                      : "border-[#CBD5E1] bg-white"
                  }`}
                >
                  {isSelected && <span className="w-1.5 h-1.5 rounded-full bg-white" />}
                </span>
                <div>
                  <div className="text-sm font-semibold text-[#0F172A]">
                    {style.name}
                  </div>
                  <div className="text-xs text-[#64748B]">
                    Typeface: {style.fontFamily}
                  </div>
                </div>
              </div>
              <span className="text-sm font-bold font-mono text-[#0F172A]">
                ৳{style.basePrice.toFixed(2)}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
