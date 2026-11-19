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
    <div role="group" aria-labelledby="duo-label" className="space-y-2">
      <span id="duo-label" className="block text-sm font-semibold text-primary-navy">
        Popular combos
      </span>
      <div className="flex flex-wrap gap-2">
        {COLOR_DUO_PRESETS.map((preset) => {
          const isActive =
            selectedBaseColor?.hexCode.toLowerCase() === preset.baseColorHex.toLowerCase() &&
            selectedTextColor?.hexCode.toLowerCase() === preset.textColorHex.toLowerCase();

          return (
            <button
              key={preset.name}
              type="button"
              title={preset.name}
              aria-label={preset.name}
              aria-pressed={isActive}
              onClick={() => handlePresetClick(preset)}
              className={`w-11 h-11 rounded-full p-1 transition-shadow cursor-pointer focus-visible:outline-none ${
                isActive
                  ? "ring-2 ring-primary-navy"
                  : "ring-1 ring-border hover:ring-border-subtle focus-visible:ring-2 focus-visible:ring-primary-navy/40"
              }`}
            >
              {/* Base colour ring with the letter colour in the middle */}
              <span
                className="w-full h-full rounded-full flex items-center justify-center border border-black/10"
                style={{ backgroundColor: preset.baseColorHex }}
              >
                <span
                  className="w-4 h-4 rounded-full border border-black/10"
                  style={{ backgroundColor: preset.textColorHex }}
                />
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
