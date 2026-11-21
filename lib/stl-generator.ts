import fs from "fs";
import path from "path";
import { FontLoader, type Font } from "three/examples/jsm/loaders/FontLoader.js";
import { keychainSTL } from "./keychain-stl";

export interface GenerateStlOptions {
  text: string;
  fontStyle?: string;
  hasKeychainLoop?: boolean;
  scale?: number; // font units → mm (default 16.0). Thickness/border/hole come from lib/keychain-geometry.ts
}

/** Loads a typeface JSON font from public/fonts, falling back to helvetiker_bold. */
function loadFont(fontStyle = "helvetiker_bold"): Font {
  const fontDir = path.join(process.cwd(), "public", "fonts");
  let fontPath = path.join(fontDir, `${fontStyle}.typeface.json`);
  if (!fs.existsSync(fontPath)) fontPath = path.join(fontDir, "helvetiker_bold.typeface.json");
  return new FontLoader().parse(JSON.parse(fs.readFileSync(fontPath, "utf8")));
}

/**
 * Generates physical print-ready binary STL for the two-tone keychain.
 * Uses the same geometry as the customer's 3D preview, scaled to millimetres.
 */
export function generateKeychainSTL(options: GenerateStlOptions): Buffer {
  const { text, fontStyle = "helvetiker_bold", hasKeychainLoop = true, scale = 16.0 } = options;
  const stl = keychainSTL(loadFont(fontStyle), text, hasKeychainLoop, scale);
  return Buffer.from(stl.buffer, stl.byteOffset, stl.byteLength);
}
