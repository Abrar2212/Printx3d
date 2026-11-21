// Shared TypeScript types for the PrintX3D platform

export type Role = "CUSTOMER" | "ADMIN";

export type OrderStatus =
  | "PENDING"
  | "CONFIRMED"
  | "PRINTING"
  | "PRINTED"
  | "SHIPPED"
  | "DELIVERED";

export type PaymentStatus = "PENDING" | "PAID" | "FAILED";

export type MaterialType = "PLA" | "PETG" | "TPU";

// ─── Font Styles ──────────────────────────────────────────────
export interface FontStyleOption {
  id: string;             // file name without .typeface.json (e.g. "helvetiker_bold")
  name: string;           // Display name (e.g. "Bold Block")
  family: string;         // Typeface category (e.g. "Sans", "Serif", "Bubble")
  description: string;    // Helper descriptor (e.g. "Punchy modern display")
  sampleText: string;     // Text sample for preview
  personalUseOnly?: boolean; // licence forbids redistribution: the plugin build leaves it out
}

export const FONT_STYLE_OPTIONS: FontStyleOption[] = [
  {
    id: "helvetiker_bold",
    name: "Bold Block",
    family: "Modern Sans",
    description: "Punchy, high-impact block typography (like 'ESC')",
    sampleText: "BOLD",
  },
  {
    id: "droid_sans_bold",
    name: "Rounded Bubble",
    family: "Playful Sans",
    description: "Chunky, organic rounded curves (like 'Fahad', 'Imran')",
    sampleText: "Fahad",
  },
  {
    id: "droid_serif_bold",
    name: "Classic Serif",
    family: "Refined Serif",
    description: "Elegant bookish serifs with sharp tails (like 'Raidah')",
    sampleText: "Raidah",
  },
  {
    id: "optimer_bold",
    name: "Vintage Slab",
    family: "Retro Serif",
    description: "Heavy retro slab serifs (like 'Baba', 'Mamun')",
    sampleText: "Baba",
  },
  {
    id: "gentilis_bold",
    name: "Geometric Tech",
    family: "Modern Tech",
    description: "Sharp, angled futuristic letterforms",
    sampleText: "TECH",
  },
  {
    id: "helvetiker_regular",
    name: "Clean Minimal",
    family: "Minimal Sans",
    description: "Lightweight, contemporary understated typography",
    sampleText: "Clean",
  },
  // Converted with scripts/font-to-typeface.py. Licenses: see public/fonts/README.md.
  {
    id: "gravity_bold",
    name: "Gravity",
    family: "Modern Sans",
    description: "Clean geometric sans, bold weight",
    sampleText: "Gravity",
  },
  // LICENSE: personal use only. Buy the commercial license before selling prints in this font.
  {
    id: "american_captain",
    personalUseOnly: true, // not shipped in the WordPress plugin
    name: "Captain",
    family: "Condensed Display",
    description: "Tall, narrow all-caps poster lettering",
    sampleText: "CAPTAIN",
  },
  // LICENSE: personal use only (demo). Buy the commercial license before selling prints in this font.
  {
    id: "thunder_script",
    personalUseOnly: true, // not shipped in the WordPress plugin
    name: "Thunder Script",
    family: "Brush Script",
    description: "Flowing handwritten brush script",
    sampleText: "Thunder",
  },
];

// ─── Style / Product ──────────────────────────────────────────
export interface StyleConfig {
  extrusionDepth: number;
  bevel: number;
  hasBasePlate: boolean;
  hasKeychainLoop?: boolean;
  maxLines?: number; // 1–3 lines of customer text (admin "Lines" setting); default 3
}

export interface Style {
  id: string;
  name: string;
  fontFamily: string;
  basePrice: number;
  config: StyleConfig;
  isActive: boolean;
}

// ─── Color / Filament ─────────────────────────────────────────
export interface FilamentColor {
  id: string;
  name: string;
  hexCode: string;
  materialType: MaterialType;
  inStock: boolean;
}

// ─── Popular Two-Tone Combinations (From Real Product Shots) ──
export interface ColorDuoPreset {
  name: string;
  baseColorHex: string;
  textColorHex: string;
  baseColorName: string;
  textColorName: string;
}

export const COLOR_DUO_PRESETS: ColorDuoPreset[] = [
  {
    name: "Onyx & Sun",
    baseColorHex: "#111111",
    textColorHex: "#FFD000",
    baseColorName: "Matte Black",
    textColorName: "Sunflower Yellow",
  },
  {
    name: "Onyx & Blaze",
    baseColorHex: "#111111",
    textColorHex: "#FF6600",
    baseColorName: "Matte Black",
    textColorName: "Flame Orange",
  },
  {
    name: "Onyx & Crimson",
    baseColorHex: "#111111",
    textColorHex: "#E50914",
    baseColorName: "Matte Black",
    textColorName: "Fire Red",
  },
  {
    name: "Onyx & Azure",
    baseColorHex: "#111111",
    textColorHex: "#00A3FF",
    baseColorName: "Matte Black",
    textColorName: "Sky Cyan",
  },
  {
    name: "Onyx & Pearl",
    baseColorHex: "#111111",
    textColorHex: "#F8FAFC",
    baseColorName: "Matte Black",
    textColorName: "Arctic White",
  },
  {
    name: "Pearl & Crimson",
    baseColorHex: "#F8FAFC",
    textColorHex: "#E50914",
    baseColorName: "Arctic White",
    textColorName: "Fire Red",
  },
  {
    name: "Pearl & Azure",
    baseColorHex: "#F8FAFC",
    textColorHex: "#00A3FF",
    baseColorName: "Arctic White",
    textColorName: "Sky Cyan",
  },
  {
    name: "Berry & Pearl",
    baseColorHex: "#FF2E93",
    textColorHex: "#F8FAFC",
    baseColorName: "Neon Rose",
    textColorName: "Arctic White",
  },
  {
    name: "Blaze & Pearl",
    baseColorHex: "#FF6600",
    textColorHex: "#F8FAFC",
    baseColorName: "Flame Orange",
    textColorName: "Arctic White",
  },
];

// ─── Customizer / 3D Preview ──────────────────────────────────
export interface CustomizerState {
  customText: string;
  selectedStyleId: string | null;
  selectedColorId: string | null;
  selectedBaseColorId: string | null;
  selectedFontStyle: string;
}

export interface MeshDimensions {
  width_mm: number;
  height_mm: number;
  depth_mm: number;
}
