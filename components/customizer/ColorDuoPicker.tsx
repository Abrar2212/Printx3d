"use client";

import { COLOR_DUO_PRESETS, type ColorDuoPreset, type FilamentColor } from "@/types";

interface ColorDuoPickerProps {
  colors: FilamentColor[];
  selectedBaseColorId: string | null;
  selectedTextColorId: string | null;
  onApplyDuo: (baseColorId: string, textColorId: string) => void;
}

export default function ColorDuoPicker({
  colors,
  selectedBaseColorId,
  selectedTextColorId,
  onApplyDuo,
}: ColorDuoPickerProps) {
  const selectedBaseColor = colors.find((c) => c.id === selectedBaseColorId);
  const selectedTextColor = colors.find((c) => c.id === selectedTextColorId);

  const handlePresetClick = (preset: ColorDuoPreset) => {
    // Find closest color in inventory matching preset hex
    const baseMatch =
      colors.find((c) => c.hexCode.toLowerCase() === preset.baseColorHex.toLowerCase()) ||
      colors.find((c) => c.name.toLowerCase().includes("black")) ||
      colors[0];

    const textMatch =
      colors.find((c) => c.hexCode.toLowerCase() === preset.textColorHex.toLowerCase()) ||
      colors.find((c) => c.name.toLowerCase().includes("gold")) ||
      colors[1];

    if (baseMatch && textMatch) {
      onApplyDuo(baseMatch.id, textMatch.id);
    }
  };

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex justify-between items-center">
        <label className="text-xs font-semibold text-[#0F172A] uppercase tracking-wider">
          Two-Tone Color Pairings
        </label>
        <span className="text-[10px] text-[#64748B] font-mono">
          From Real Prints
        </span>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {COLOR_DUO_PRESETS.map((preset) => {
          const isActive =
            selectedBaseColor?.hexCode.toLowerCase() === preset.baseColorHex.toLowerCase() &&
            selectedTextColor?.hexCode.toLowerCase() === preset.textColorHex.toLowerCase();

          return (
            <button
              key={preset.name}
              type="button"
              title={preset.name}
              onClick={() => handlePresetClick(preset)}
              className={`relative w-8 h-8 rounded-lg transition-all flex items-center justify-center p-0.5 cursor-pointer ${
                isActive
                  ? "border-2 border-[#0F172A] scale-105 shadow-xs"
                  : "border border-[#E2E8F0] hover:border-[#94A3B8] hover:scale-105 shadow-2xs"
              }`}
            >
              {/* Dual Swatch Display: Base color outer with text color inner disc */}
              <div
                className="w-full h-full rounded-[5px] overflow-hidden relative"
                style={{ backgroundColor: preset.baseColorHex }}
              >
                <div
                  className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-3.5 h-3.5 rounded-full shadow-xs border border-black/15"
                  style={{ backgroundColor: preset.textColorHex }}
                />
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

