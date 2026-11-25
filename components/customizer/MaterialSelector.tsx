"use client";

import { useId } from "react";

interface MaterialSelectorProps {
  materials: readonly { id: string; name: string }[];
  selectedId: string;
  onSelect: (id: string) => void;
}

export default function MaterialSelector({ materials, selectedId, onSelect }: MaterialSelectorProps) {
  const labelId = useId();
  return (
    <div role="group" aria-labelledby={labelId} className="space-y-2">
      <span id={labelId} className="block text-sm font-semibold text-primary-navy">
        Material
      </span>
      <div className="grid grid-cols-2 gap-2">
        {materials.map((m) => (
          <button
            key={m.id}
            type="button"
            onClick={() => onSelect(m.id)}
            aria-pressed={selectedId === m.id}
            className={`h-11 px-2 rounded-lg border text-sm font-medium transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-navy/30 ${
              selectedId === m.id
                ? "border-primary-navy bg-primary-navy text-white"
                : "border-border bg-surface text-primary-navy hover:border-border-subtle hover:bg-bg"
            }`}
          >
            {m.name}
          </button>
        ))}
      </div>
    </div>
  );
}
