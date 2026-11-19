import fs from "fs";
import path from "path";
import * as THREE from "three";
import { FontLoader, type Font } from "three/examples/jsm/loaders/FontLoader.js";
import { STLExporter } from "three/examples/jsm/exporters/STLExporter.js";
import {
  buildKeychainPlate,
  buildKeychainText,
  keychainText,
  BASE_DEPTH,
  TEXT_SINK,
} from "./keychain-geometry";

export interface GenerateStlOptions {
  text: string;
  fontStyle?: string;
  hasKeychainLoop?: boolean;
  scale?: number; // font units → mm (default 16.0). Thickness/border/hole come from lib/keychain-geometry.ts
}

/**
 * Loads and parses a typeface JSON font from public/fonts
 */
function loadFont(fontStyle = "helvetiker_bold"): Font {
  const fontDir = path.join(process.cwd(), "public", "fonts");
  const preferredFile = path.join(fontDir, `${fontStyle}.typeface.json`);
  const fallbackFile = path.join(fontDir, "helvetiker_bold.typeface.json");

  let fontPath = preferredFile;
  if (!fs.existsSync(fontPath)) {
    fontPath = fallbackFile;
  }

  const fontJson = JSON.parse(fs.readFileSync(fontPath, "utf8"));
  const loader = new FontLoader();
  return loader.parse(fontJson);
}

/**
 * Generates physical print-ready binary STL for the two-tone keychain.
 * Uses the same geometry as the customer's 3D preview, scaled to millimetres.
 * Returns a Node.js Buffer suitable for streaming or file download.
 */
export function generateKeychainSTL(options: GenerateStlOptions): Buffer {
  const { text, fontStyle = "helvetiker_bold", hasKeychainLoop = true, scale = 16.0 } = options;

  const safeText = keychainText(text);
  const font = loadFont(fontStyle);

  const group = new THREE.Group();
  const baseMesh = new THREE.Mesh(buildKeychainPlate(font, safeText, hasKeychainLoop));
  const textMesh = new THREE.Mesh(buildKeychainText(font, safeText));
  textMesh.position.set(0, 0, BASE_DEPTH - TEXT_SINK);

  group.add(baseMesh);
  group.add(textMesh);

  // Scale up to physical millimeters (e.g. 16x)
  group.scale.set(scale, scale, scale);

  // Auto-center X and Y on print bed origin (0, 0) and place bottom directly on Z = 0
  const bbox = new THREE.Box3().setFromObject(group);
  const center = new THREE.Vector3();
  bbox.getCenter(center);
  group.position.set(-center.x, -center.y, -bbox.min.z);

  // Recompute transform matrix
  group.updateMatrixWorld(true);

  // STLExporter export to binary
  const exporter = new STLExporter();
  const stlArrayBuffer = exporter.parse(group, { binary: true });

  if (stlArrayBuffer instanceof ArrayBuffer) {
    return Buffer.from(stlArrayBuffer);
  } else if (typeof stlArrayBuffer === "string") {
    return Buffer.from(stlArrayBuffer, "utf-8");
  } else {
    // In case it's a DataView
    return Buffer.from((stlArrayBuffer as any).buffer);
  }
}
