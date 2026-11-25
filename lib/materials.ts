// Print materials a customer can choose. The WordPress plugin has the same list (PRINTX3D_MATERIALS).
export const MATERIALS = [
  { id: "PLA", name: "Plastic (PLA+)" },
  { id: "TPU", name: "Flexible (TPU)" },
] as const;
export const MATERIAL_IDS = ["PLA", "TPU"] as const;

/** Display name; empty for orders placed before materials could be chosen. */
export const materialName = (id?: string | null) => MATERIALS.find((m) => m.id === id)?.name ?? "";

interface StockColor {
  id: string;
  hexCode: string;
  materials: string[];
}

/**
 * The colours a material comes in, and the letter/base colours to use. A picked colour the
 * material doesn't come in falls back to a default, and returns when the customer switches back.
 */
export function colorsFor<C extends StockColor>(colors: C[], material: string, textId: string, baseId: string) {
  const available = colors.filter((c) => c.materials.includes(material));
  const find = (...hex: string[]) => available.find((c) => hex.includes(c.hexCode));
  const text: C | undefined =
    available.find((c) => c.id === textId) ?? find("#FF6600", "#FFD000") ?? available[1] ?? available[0];
  const base: C | undefined = available.find((c) => c.id === baseId) ?? find("#111111") ?? available[0];
  return { available, text, base };
}
