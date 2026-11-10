import fs from "fs";
import path from "path";
import * as THREE from "three";
import { FontLoader, type Font } from "three/examples/jsm/loaders/FontLoader.js";
import { TextGeometry } from "three/examples/jsm/geometries/TextGeometry.js";
import { STLExporter } from "three/examples/jsm/exporters/STLExporter.js";

export interface GenerateStlOptions {
  text: string;
  fontStyle?: string;
  hasKeychainLoop?: boolean;
  scale?: number; // scale multiplier to real-world mm (default 16.0)
  baseDepthMm?: number; // base thickness in mm (default 2.0mm)
  textDepthMm?: number; // text embossing thickness in mm (default 1.8mm)
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
 * Generates physical print-ready binary STL for the two-tone keychain
 * Returns a Node.js Buffer suitable for streaming or file download.
 */
export function generateKeychainSTL(options: GenerateStlOptions): Buffer {
  const {
    text,
    fontStyle = "helvetiker_bold",
    hasKeychainLoop = true,
    scale = 16.0,
    baseDepthMm = 2.0,
    textDepthMm = 1.8,
  } = options;

  const safeText = (text.trim() || "KEY").slice(0, 30);
  const font = loadFont(fontStyle);

  // Measure raw letter contours
  const rawShapes = font.generateShapes(safeText, 1.2);
  const rawLetterBBox = new THREE.Box2();
  rawShapes.forEach((s) => s.getPoints().forEach((p) => rawLetterBBox.expandByPoint(p)));

  const initialLetterMinX = rawLetterBBox.min.x;
  const initialLetterCenterY = (rawLetterBBox.max.y + Math.max(0, rawLetterBBox.min.y)) / 2;
  const earRadius = 0.22;
  const holeRadius = 0.08; // ~2.5mm hole after 16x scaling, perfect for standard keyrings
  const earX = initialLetterMinX - 0.14;
  const earY = Math.max(0.60, initialLetterCenterY + 0.06);

  const letterPts: THREE.Vector2[] = [];
  rawShapes.forEach((s) => s.getSpacedPoints(120).forEach((p) => letterPts.push(p)));

  const rawBBox = new THREE.Box2();
  letterPts.forEach((p) => rawBBox.expandByPoint(p));

  const R = 0.12;
  const baselineRunnerY = -0.11;
  const yMinWaist = Math.max(0.38, Math.min(rawBBox.min.y, 0) + 0.38);

  const allPts: THREE.Vector2[] = [...letterPts];
  if (hasKeychainLoop) {
    const earSegments = 36;
    for (let i = 0; i < earSegments; i++) {
      const theta = (i / earSegments) * Math.PI * 2;
      allPts.push(
        new THREE.Vector2(
          earX + Math.cos(theta) * (earRadius - R),
          earY + Math.sin(theta) * (earRadius - R)
        )
      );
    }
  }

  // Right contour hugging last letter
  const filteredLastPts = letterPts.filter((p) => p.x > rawBBox.max.x - 0.85);
  const lastLetterPts = filteredLastPts.length > 0 ? filteredLastPts : letterPts;
  const lastBBox = new THREE.Box2();
  lastLetterPts.forEach((p) => lastBBox.expandByPoint(p));

  const rightProfile: THREE.Vector2[] = [];
  const yStartLast = lastBBox.min.y - R;
  const yEndLast = lastBBox.max.y + R;
  const stepY = 0.02;

  for (let y = yStartLast; y <= yEndLast + 0.001; y += stepY) {
    let maxX = -Infinity;
    for (const p of lastLetterPts) {
      const dy = Math.abs(y - p.y);
      if (dy <= R) {
        const x = p.x + Math.sqrt(R * R - dy * dy);
        if (x > maxX) maxX = x;
      }
    }
    if (maxX !== -Infinity) {
      rightProfile.push(new THREE.Vector2(+maxX.toFixed(3), +y.toFixed(3)));
    }
  }

  const xStart = hasKeychainLoop ? earX : rawBBox.min.x - R;
  const xEnd = rightProfile.length > 0 ? rightProfile[rightProfile.length - 1].x : rawBBox.max.x + R;
  const step = 0.015;

  const topPoints: THREE.Vector2[] = [];
  let lastTopY = earY + earRadius;

  for (let x = xStart; x <= xEnd + 0.001; x += step) {
    let maxY = -Infinity;
    for (const p of allPts) {
      const dx = Math.abs(x - p.x);
      if (dx <= R) {
        const y = p.y + Math.sqrt(R * R - dx * dx);
        if (y > maxY) maxY = y;
      }
    }
    if (maxY === -Infinity) maxY = lastTopY;
    else lastTopY = maxY;

    if (x >= rawBBox.min.x && x <= rawBBox.max.x) {
      maxY = Math.max(maxY, yMinWaist);
    }
    topPoints.push(new THREE.Vector2(+x.toFixed(3), +maxY.toFixed(3)));
  }

  const bottomPoints: THREE.Vector2[] = [];
  const xBottomEnd = rightProfile.length > 0 ? rightProfile[0].x : rawBBox.max.x + R;
  let lastBottomY = baselineRunnerY;

  for (let x = rawBBox.min.x; x <= xBottomEnd + 0.001; x += step) {
    let minY = Infinity;
    for (const p of letterPts) {
      const dx = Math.abs(x - p.x);
      if (dx <= R) {
        const y = p.y - Math.sqrt(R * R - dx * dx);
        if (y < minY) minY = y;
      }
    }
    if (minY === Infinity) minY = lastBottomY;
    else lastBottomY = minY;

    minY = Math.min(minY, baselineRunnerY);
    bottomPoints.push(new THREE.Vector2(+x.toFixed(3), +minY.toFixed(3)));
  }

  const plate = new THREE.Shape();

  if (hasKeychainLoop) {
    const lowerLeftCornerR = 0.18;
    const lowerLeftX = earX - 0.02;

    plate.moveTo(lowerLeftX + lowerLeftCornerR, baselineRunnerY);

    for (let i = 0; i < bottomPoints.length; i++) {
      plate.lineTo(bottomPoints[i].x, bottomPoints[i].y);
    }
    for (let i = 0; i < rightProfile.length; i++) {
      plate.lineTo(rightProfile[i].x, rightProfile[i].y);
    }
    for (let i = topPoints.length - 1; i >= 0; i--) {
      plate.lineTo(topPoints[i].x, topPoints[i].y);
    }
    plate.absarc(earX, earY, earRadius, Math.PI / 2, (3 * Math.PI) / 2, false);
    plate.lineTo(lowerLeftX, baselineRunnerY + lowerLeftCornerR);
    plate.absarc(lowerLeftX + lowerLeftCornerR, baselineRunnerY + lowerLeftCornerR, lowerLeftCornerR, Math.PI, (3 * Math.PI) / 2, false);
    plate.closePath();

    const hole = new THREE.Path();
    hole.absarc(earX, earY, holeRadius, 0, Math.PI * 2, true);
    plate.holes.push(hole);
  } else {
    const leftCornerR = 0.10;
    plate.moveTo(rawBBox.min.x - R + leftCornerR, baselineRunnerY);
    for (let i = 0; i < bottomPoints.length; i++) {
      plate.lineTo(bottomPoints[i].x, bottomPoints[i].y);
    }
    for (let i = 0; i < rightProfile.length; i++) {
      plate.lineTo(rightProfile[i].x, rightProfile[i].y);
    }
    for (let i = topPoints.length - 1; i >= 0; i--) {
      plate.lineTo(topPoints[i].x, topPoints[i].y);
    }
    plate.lineTo(rawBBox.min.x - R, baselineRunnerY + leftCornerR);
    plate.absarc(rawBBox.min.x - R + leftCornerR, baselineRunnerY + leftCornerR, leftCornerR, Math.PI, (3 * Math.PI) / 2, false);
    plate.closePath();
  }

  // Base Extrusion
  const baseDepthUnits = baseDepthMm / scale;
  const textDepthUnits = textDepthMm / scale;

  const baseGeom = new THREE.ExtrudeGeometry(plate, {
    depth: baseDepthUnits,
    curveSegments: 20,
    bevelEnabled: true,
    bevelThickness: 0.02,
    bevelSize: 0.015,
    bevelSegments: 3,
  });

  // Flatten bottom face to z=0 for bed adhesion
  const pos = baseGeom.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    if (pos.getZ(i) < 0) pos.setZ(i, 0);
  }
  baseGeom.computeVertexNormals();

  // Text Extrusion
  const textGeom = new TextGeometry(safeText, {
    font,
    size: 1.2,
    depth: textDepthUnits,
    curveSegments: 20,
    bevelEnabled: true,
    bevelThickness: 0.015,
    bevelSize: 0.015,
    bevelSegments: 3,
  });
  textGeom.computeVertexNormals();

  // Assemble into unified scene for export
  const group = new THREE.Group();
  const baseMesh = new THREE.Mesh(baseGeom);
  const textMesh = new THREE.Mesh(textGeom);

  // Position text exactly on top of base plate
  textMesh.position.set(0, 0, baseDepthUnits);

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

