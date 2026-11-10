// Placeholder for STL / mesh generation helpers
// Called server-side when exporting order specs.

export interface MeshDimensions {
  width_mm: number;
  height_mm: number;
  depth_mm: number;
}

/**
 * Generates a URL-safe slug for the STL file name.
 * Example: "John Doe | Keychain" → "john-doe-keychain.stl"
 */
export function buildStlFileName(text: string, styleName: string): string {
  return `${text}-${styleName}`
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "") + ".stl";
}

/**
 * Estimate real-world dimensions from character count + style config.
 * These are approximations; the Three.js client computes the exact mesh.
 */
export function estimateDimensions(
  text: string,
  extrusionDepth: number
): MeshDimensions {
  const charWidth = 8; // mm per character (rough average)
  const letterHeight = 12; // mm
  return {
    width_mm: Math.max(text.length * charWidth, 20),
    height_mm: letterHeight,
    depth_mm: extrusionDepth,
  };
}

