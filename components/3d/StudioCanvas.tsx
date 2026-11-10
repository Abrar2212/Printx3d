"use client";

import { Canvas, useLoader } from "@react-three/fiber";
import { OrbitControls, Center } from "@react-three/drei";
import { useMemo, useRef, useState, Suspense } from "react";
import * as THREE from "three";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faPlay, faPause, faRotate, faLock } from "@fortawesome/free-solid-svg-icons";
import { FontLoader } from "three/examples/jsm/loaders/FontLoader.js";
import { TextGeometry } from "three/examples/jsm/geometries/TextGeometry.js";
import type { OrbitControls as OrbitControlsType } from "three-stdlib";

interface StudioCanvasProps {
  text: string;
  textColor: string;          // Top layer embossed lettering color
  baseColor: string;          // Key contour background plate color
  fontStyle?: string;         // Font ID e.g. "helvetiker_bold"
  materialType?: "PLA" | "PETG" | "TPU";
  extrusionDepth?: number;
  bevel?: number;
  hasKeychainLoop?: boolean;
}

// Smooths discrete contour points with a 5-tap Gaussian blur kernel for silky organic curves
function smoothContourPoints(pts: THREE.Vector2[], passes = 6): THREE.Vector2[] {
  if (pts.length < 5) return pts;
  let curr = pts;
  for (let p = 0; p < passes; p++) {
    const next: THREE.Vector2[] = [];
    for (let i = 0; i < curr.length; i++) {
      if (i < 2 || i >= curr.length - 2) {
        next.push(curr[i]);
      } else {
        const p_2 = curr[i - 2];
        const p_1 = curr[i - 1];
        const c = curr[i];
        const p1 = curr[i + 1];
        const p2 = curr[i + 2];
        next.push(
          new THREE.Vector2(
            c.x,
            0.06 * p_2.y + 0.24 * p_1.y + 0.40 * c.y + 0.24 * p1.y + 0.06 * p2.y
          )
        );
      }
    }
    curr = next;
  }
  return curr;
}

// Helper: convert hex color string to RGB numbers
function hexToRgbComponents(hex: string): { r: number; g: number; b: number } {
  const clean = hex.replace("#", "");
  const num = parseInt(clean.length === 3 ? clean.split("").map((c) => c + c).join("") : clean, 16);
  return {
    r: (num >> 16) & 255,
    g: (num >> 8) & 255,
    b: num & 255,
  };
}

// Procedural authentic 3D printed polymer micro-texture for letters
function createPrintPolymerTexture(hexColor: string): THREE.CanvasTexture | null {
  if (typeof document === "undefined") return null;
  const size = 256;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;

  const { r, g, b } = hexToRgbComponents(hexColor);
  const imgData = ctx.createImageData(size, size);
  const data = imgData.data;
  const spacing = 8; // Fine 0.4mm nozzle layer micro-lines

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      // 45-degree diagonal infill print lines
      const dist = (x + y) % spacing;
      const norm = dist / spacing;
      const bead = Math.sin(norm * Math.PI);
      const grain = (Math.random() - 0.5) * 0.06;

      // Realistic polymer sheen: subtle 12% shading across bead crests + micro-grain
      const factor = 0.90 + bead * 0.14 + grain;
      const pr = Math.max(0, Math.min(255, Math.round(r * factor)));
      const pg = Math.max(0, Math.min(255, Math.round(g * factor)));
      const pb = Math.max(0, Math.min(255, Math.round(b * factor)));

      const idx = (y * size + x) * 4;
      data[idx] = pr;
      data[idx + 1] = pg;
      data[idx + 2] = pb;
      data[idx + 3] = 255;
    }
  }
  ctx.putImageData(imgData, 0, 0);

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(1.4, 1.4);
  texture.anisotropy = 4;
  texture.needsUpdate = true;
  return texture;
}

// Procedural 3D print micro-relief bump map
function createPrintBumpTexture(): THREE.CanvasTexture | null {
  if (typeof document === "undefined") return null;
  const size = 256;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;

  const imgData = ctx.createImageData(size, size);
  const data = imgData.data;
  const spacing = 8;

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const dist = (x + y) % spacing;
      const norm = dist / spacing;
      const bead = Math.sin(norm * Math.PI);
      const grain = (Math.random() - 0.5) * 0.06;
      const val = Math.max(0, Math.min(255, Math.round((bead * 0.60 + 0.40 + grain) * 255)));

      const idx = (y * size + x) * 4;
      data[idx] = val;
      data[idx + 1] = val;
      data[idx + 2] = val;
      data[idx + 3] = 255;
    }
  }
  ctx.putImageData(imgData, 0, 0);

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(1.4, 1.4);
  texture.needsUpdate = true;
  return texture;
}

// Procedural textured PEI powder-coated build plate texture for baseplate
function createPeiTexture(hexColor: string): THREE.CanvasTexture | null {
  if (typeof document === "undefined") return null;
  const size = 128;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;

  const { r, g, b } = hexToRgbComponents(hexColor);
  const imgData = ctx.createImageData(size, size);
  const data = imgData.data;
  for (let i = 0; i < data.length; i += 4) {
    const grain = (Math.random() - 0.5) * 0.20;
    const factor = Math.max(0, 1.0 + grain);
    data[i] = Math.max(0, Math.min(255, Math.round(r * factor)));
    data[i + 1] = Math.max(0, Math.min(255, Math.round(g * factor)));
    data[i + 2] = Math.max(0, Math.min(255, Math.round(b * factor)));
    data[i + 3] = 255;
  }
  ctx.putImageData(imgData, 0, 0);

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(6, 6);
  texture.needsUpdate = true;
  return texture;
}

function KeychainMesh({
  text,
  textColor,
  baseColor,
  fontStyle = "helvetiker_bold",
  hasKeychainLoop = true,
}: StudioCanvasProps) {
  const safeText = (text.trim() || "KEY").slice(0, 30);
  const fontPath = `/fonts/${fontStyle}.typeface.json`;

  // Load font geometry
  const font = useLoader(FontLoader, fontPath);

  // Sleek, physical 3D print dimensions
  const baseDepth = 0.20;     // 2.0mm thick unified background contour plate
  const textDepth = 0.18;     // 1.8mm crisp embossed letters

  // 1. Base Geometry — CAD-Grade Per-Letter Contour Silhouette (Upper/Lower Envelopes + Precise First/Last Letter Profiles)
  const baseGeometry = useMemo(() => {
    const shapes = font.generateShapes(safeText, 1.2);
    const letterPts: THREE.Vector2[] = [];
    shapes.forEach((s) => {
      s.getSpacedPoints(180).forEach((p) => letterPts.push(new THREE.Vector2(p.x, p.y)));
      s.holes.forEach((h) => {
        h.getSpacedPoints(100).forEach((p) => letterPts.push(new THREE.Vector2(p.x, p.y)));
      });
    });

    const rawBBox = new THREE.Box2();
    letterPts.forEach((p) => rawBBox.expandByPoint(p));

    const firstShapes = font.generateShapes(safeText[0] || "A", 1.2);
    const firstBox = new THREE.Box2();
    const firstPts: THREE.Vector2[] = [];
    firstShapes.forEach((s) => s.getSpacedPoints(150).forEach((p) => {
      firstBox.expandByPoint(p);
      firstPts.push(p);
    }));

    const lastChar = safeText[safeText.length - 1] || "A";
    const lastShapes = font.generateShapes(lastChar, 1.2);
    const lastBox = new THREE.Box2();
    const lastPts: THREE.Vector2[] = [];
    lastShapes.forEach((s) => s.getSpacedPoints(150).forEach((p) => {
      lastBox.expandByPoint(p);
      lastPts.push(p);
    }));

    const lastCharOffset = rawBBox.max.x - lastBox.max.x;
    const worldLastPts = lastPts.map((p) => new THREE.Vector2(p.x + lastCharOffset, p.y));

    const R = 0.18; // Offset radius around text
    const step = 0.015; // Fine sampling step

    // Start and end anchors for envelopes:
    let firstTopPt = firstPts[0];
    for (const p of firstPts) {
      if (p.y > firstTopPt.y) firstTopPt = p;
    }
    let firstBottomPt = firstPts[0];
    for (const p of firstPts) {
      if (p.x < firstBottomPt.x) firstBottomPt = p;
    }

    let lastRightPt = worldLastPts[0];
    for (const p of worldLastPts) {
      if (p.x > lastRightPt.x) lastRightPt = p;
    }

    // 1. Bottom Envelope: from firstBottomPt.x to lastRightPt.x
    const bottomXStart = firstBottomPt.x;
    const bottomXEnd = lastRightPt.x;
    const bottomXSamples: number[] = [];
    for (let x = bottomXStart; x <= bottomXEnd + 0.0001; x += step) {
      bottomXSamples.push(+x.toFixed(4));
    }

    const rawLower: number[] = [];
    for (let i = 0; i < bottomXSamples.length; i++) {
      const x = bottomXSamples[i];
      let minY = Infinity;
      for (const p of letterPts) {
        const dx = Math.abs(x - p.x);
        if (dx <= R) {
          const d = Math.sqrt(Math.max(0, R * R - dx * dx));
          if (p.y - d < minY) minY = p.y - d;
        }
      }
      if (minY === Infinity) minY = -0.16;
      if (minY > -0.06) minY = -0.06;
      rawLower.push(minY);
    }

    const bridgeSpan = 3;
    const bridgedLower: number[] = [];
    for (let i = 0; i < rawLower.length; i++) {
      let m = Infinity;
      for (let j = Math.max(0, i - bridgeSpan); j <= Math.min(rawLower.length - 1, i + bridgeSpan); j++) {
        if (rawLower[j] < m) m = rawLower[j];
      }
      bridgedLower.push(m);
    }

    let smoothLower = [...bridgedLower];
    for (let pass = 0; pass < 3; pass++) {
      const next: number[] = [];
      for (let i = 0; i < smoothLower.length; i++) {
        if (i === 0 || i === smoothLower.length - 1) {
          next.push(smoothLower[i]);
        } else {
          next.push(0.20 * smoothLower[i - 1] + 0.60 * smoothLower[i] + 0.20 * smoothLower[i + 1]);
        }
      }
      smoothLower = next;
    }

    // 2. Top Envelope: from firstTopPt.x to lastRightPt.x
    const topXStart = firstTopPt.x;
    const topXEnd = lastRightPt.x;
    const topXSamples: number[] = [];
    for (let x = topXStart; x <= topXEnd + 0.0001; x += step) {
      topXSamples.push(+x.toFixed(4));
    }

    const rawUpper: number[] = [];
    for (let i = 0; i < topXSamples.length; i++) {
      const x = topXSamples[i];
      let maxY = -Infinity;
      for (const p of letterPts) {
        const dx = Math.abs(x - p.x);
        if (dx <= R) {
          const d = Math.sqrt(Math.max(0, R * R - dx * dx));
          if (p.y + d > maxY) maxY = p.y + d;
        }
      }
      if (maxY === -Infinity) maxY = 0.60;
      rawUpper.push(maxY);
    }

    const bridgedUpper: number[] = [];
    for (let i = 0; i < rawUpper.length; i++) {
      let m = -Infinity;
      for (let j = Math.max(0, i - bridgeSpan); j <= Math.min(rawUpper.length - 1, i + bridgeSpan); j++) {
        if (rawUpper[j] > m) m = rawUpper[j];
      }
      bridgedUpper.push(m);
    }

    let smoothUpper = [...bridgedUpper];
    for (let pass = 0; pass < 3; pass++) {
      const next: number[] = [];
      for (let i = 0; i < smoothUpper.length; i++) {
        if (i === 0 || i === smoothUpper.length - 1) {
          next.push(smoothUpper[i]);
        } else {
          next.push(0.20 * smoothUpper[i - 1] + 0.60 * smoothUpper[i] + 0.20 * smoothUpper[i + 1]);
        }
      }
      smoothUpper = next;
    }

    // 3. Right Flank: Follows true contour of last letter from bottom to top
    const yBottomRight = smoothLower[smoothLower.length - 1];
    const yTopRight = smoothUpper[smoothUpper.length - 1];
    const rightSamples: { x: number; y: number }[] = [];
    const stepY = 0.015;

    for (let y = yBottomRight; y <= yTopRight + 0.0001; y += stepY) {
      let maxX = -Infinity;
      for (const p of worldLastPts) {
        const dy = Math.abs(y - p.y);
        if (dy <= R) {
          const d = Math.sqrt(Math.max(0, R * R - dy * dy));
          if (p.x + d > maxX) maxX = p.x + d;
        }
      }
      if (maxX === -Infinity) maxX = lastRightPt.x + R;
      rightSamples.push({ x: maxX, y: +y.toFixed(4) });
    }

    let smoothRight = [...rightSamples];
    for (let pass = 0; pass < 3; pass++) {
      const next: { x: number; y: number }[] = [];
      for (let i = 0; i < smoothRight.length; i++) {
        if (i === 0 || i === smoothRight.length - 1) {
          next.push(smoothRight[i]);
        } else {
          next.push({
            x: 0.20 * smoothRight[i - 1].x + 0.60 * smoothRight[i].x + 0.20 * smoothRight[i + 1].x,
            y: smoothRight[i].y,
          });
        }
      }
      smoothRight = next;
    }

    // 4. Left Flank: Follows true contour of first letter from bottom to top
    const yTopLeft = smoothUpper[0];
    const yBottomLeft = smoothLower[0];
    const earRadius = 0.22;
    const holeRadius = 0.10;
    const earOffset = 0.14;
    const earY = Math.max(0.48, Math.min(0.65, (firstBox.max.y + firstBox.min.y) / 2));

    const leftSamples: { x: number; y: number }[] = [];
    for (let y = yBottomLeft; y <= yTopLeft + 0.0001; y += stepY) {
      let minX = Infinity;
      for (const p of firstPts) {
        const dy = Math.abs(y - p.y);
        if (dy <= R) {
          const d = Math.sqrt(Math.max(0, R * R - dy * dy));
          if (p.x - d < minX) minX = p.x - d;
        }
      }
      if (minX === Infinity) minX = firstBox.min.x - R;
      leftSamples.push({ x: minX, y: +y.toFixed(4) });
    }

    // Natural contour position at earY:
    let contourXAtEar = firstBox.min.x - R;
    let minDiff = Infinity;
    for (const lp of leftSamples) {
      const diff = Math.abs(lp.y - earY);
      if (diff < minDiff) {
        minDiff = diff;
        contourXAtEar = lp.x;
      }
    }
    const earX = contourXAtEar - earOffset;

    // Attach keyring loop if enabled:
    const leftWithEar: { x: number; y: number }[] = [];
    for (const lp of leftSamples) {
      if (hasKeychainLoop) {
        const dy = Math.abs(lp.y - earY);
        if (dy < earRadius) {
          const dxEar = Math.sqrt(earRadius * earRadius - dy * dy);
          leftWithEar.push({ x: Math.min(lp.x, earX - dxEar), y: lp.y });
        } else {
          leftWithEar.push(lp);
        }
      } else {
        leftWithEar.push(lp);
      }
    }

    let smoothLeft = [...leftWithEar];
    for (let pass = 0; pass < 3; pass++) {
      const next: { x: number; y: number }[] = [];
      for (let i = 0; i < smoothLeft.length; i++) {
        if (i === 0 || i === smoothLeft.length - 1) {
          next.push(smoothLeft[i]);
        } else {
          next.push({
            x: 0.15 * smoothLeft[i - 1].x + 0.70 * smoothLeft[i].x + 0.15 * smoothLeft[i + 1].x,
            y: smoothLeft[i].y,
          });
        }
      }
      smoothLeft = next;
    }

    // 5. Build Unified 2D Shape
    const plate = new THREE.Shape();
    plate.moveTo(bottomXSamples[0], smoothLower[0]);
    for (let i = 1; i < bottomXSamples.length; i++) {
      plate.lineTo(bottomXSamples[i], smoothLower[i]);
    }
    for (let i = 0; i < smoothRight.length; i++) {
      plate.lineTo(smoothRight[i].x, smoothRight[i].y);
    }
    for (let i = topXSamples.length - 1; i >= 0; i--) {
      plate.lineTo(topXSamples[i], smoothUpper[i]);
    }
    for (let i = smoothLeft.length - 1; i >= 0; i--) {
      plate.lineTo(smoothLeft[i].x, smoothLeft[i].y);
    }
    plate.closePath();

    if (hasKeychainLoop) {
      const hole = new THREE.Path();
      hole.absarc(earX, earY, holeRadius, 0, Math.PI * 2, true);
      plate.holes.push(hole);
    }

    // Extrude the single unified continuous plate with silky smooth rounded bevel
    const geom = new THREE.ExtrudeGeometry(plate, {
      depth: baseDepth,
      curveSegments: 28,
      bevelEnabled: true,
      bevelThickness: 0.024,
      bevelSize: 0.020,
      bevelSegments: 4,
    });

    // Flatten rear vertices to z = 0 for a 100% planar flat back
    const pos = geom.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      if (pos.getZ(i) < 0) {
        pos.setZ(i, 0);
      }
    }
    geom.computeVertexNormals();
    geom.computeBoundingBox();
    return geom;
  }, [safeText, font, baseDepth, hasKeychainLoop]);

  // 2. Foreground Embossed Text Geometry — Silky Smooth Edges (optimized for mobile)
  const frontGeometry = useMemo(() => {
    const geom = new TextGeometry(safeText, {
      font,
      size: 1.2,
      depth: textDepth,
      curveSegments: 32,
      bevelEnabled: true,
      bevelThickness: 0.022,
      bevelSize: 0.018,
      bevelSegments: 5,
    });
    geom.computeVertexNormals();
    geom.computeBoundingBox();
    return geom;
  }, [safeText, font, textDepth]);

  // Measure bounding box of unified baseplate
  const bbox = baseGeometry.boundingBox || new THREE.Box3();
  const rawModelWidth = Math.max(bbox.max.x - bbox.min.x, 0.1);

  // Adaptive auto-scale:
  // - Target display width: 2.1 units (clean, realistic product size).
  // - Clamped to max 0.32 so short words stay small and delicate.
  const targetDisplayWidth = 2.1;
  const scale = Math.min(0.32, targetDisplayWidth / rawModelWidth);

  // Textures for authentic 3D printed polymer finish
  const textPolymerTexture = useMemo(() => createPrintPolymerTexture(textColor), [textColor]);
  const textBumpTexture = useMemo(() => createPrintBumpTexture(), []);
  const peiTexture = useMemo(() => createPeiTexture(baseColor), [baseColor]);

  // Crystal clear polished materials with authentic physical polymer texture
  const baseMatProps = useMemo(
    () => ({
      map: peiTexture ?? undefined,
      color: "#FFFFFF",
      roughness: 0.42,
      metalness: 0.02,
      clearcoat: 0.16,
      clearcoatRoughness: 0.30,
    }),
    [peiTexture]
  );

  const textMatProps = useMemo(
    () => ({
      map: textPolymerTexture ?? undefined,
      color: "#FFFFFF",
      bumpMap: textBumpTexture ?? undefined,
      bumpScale: 0.010, // Subtle authentic micro-filament relief
      roughness: 0.28,
      metalness: 0.03,
      clearcoat: 0.35,
      clearcoatRoughness: 0.18,
    }),
    [textPolymerTexture, textBumpTexture]
  );

  return (
    <Center
      key={`${safeText}-${fontStyle}-${scale.toFixed(4)}`}
      position={[0, 0.40, 0]}
    >
      {/* ── Scaled group: petite display size matching real handheld keychain ── */}
      <group scale={[scale, scale, scale]} position={[0, 0, 0]}>
        {/* ── 1. Background Baseplate (Clean Physical 3D Printed Silhouette with Integrated Keyring Hole) ── */}
        <mesh geometry={baseGeometry} position={[0, 0, 0]} castShadow receiveShadow>
          <meshPhysicalMaterial {...baseMatProps} />
        </mesh>

        {/* ── 2. Foreground Embossed Text (Seamlessly fused into baseplate at z = baseDepth) ── */}
        <mesh geometry={frontGeometry} position={[0, 0, baseDepth - 0.008]} castShadow>
          <meshPhysicalMaterial {...textMatProps} />
        </mesh>
      </group>
    </Center>
  );
}

export default function StudioCanvas(props: StudioCanvasProps) {
  // Controls state: Still by default
  const [isAutoRotating, setIsAutoRotating] = useState(false);
  const controlsRef = useRef<OrbitControlsType>(null);

  const handleResetCamera = () => {
    if (controlsRef.current) {
      controlsRef.current.reset();
    }
  };

  return (
    <div className="w-full h-full relative select-none touch-none">
      <Canvas
        camera={{ position: [0, 0.0, 6.8], fov: 38 }}
        style={{ width: "100%", height: "100%", background: "#F1F5F9", touchAction: "none" }}
        gl={{
          antialias: true,
          powerPreference: "default",
          preserveDrawingBuffer: true,
        }}
        dpr={[1, 1.5]}
        shadows
      >
        <ambientLight intensity={0.75} />
        <hemisphereLight args={["#FFFFFF", "#64748B", 0.65]} />
        <directionalLight
          position={[6, 10, 8]}
          intensity={1.6}
          castShadow
          shadow-mapSize={[1024, 1024]}
          shadow-bias={-0.0001}
        />
        <directionalLight position={[-6, 4, -4]} intensity={0.5} />
        <directionalLight position={[0, -6, 5]} intensity={0.3} />

        <Suspense fallback={null}>
          <KeychainMesh {...props} />
        </Suspense>

        {/* Soft mobile-safe floor shadow (100% crash-proof on mobile GPUs) */}
        <mesh position={[0, -0.05, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
          <planeGeometry args={[12, 12]} />
          <shadowMaterial opacity={0.25} />
        </mesh>

        {/* Orbit Controls: Still by default, centered pivot on model */}
        <OrbitControls
          ref={controlsRef}
          target={[0, 0.25, 0]}
          enablePan={false}
          enableZoom={true}
          zoomSpeed={0.85}
          minDistance={2.2}
          maxDistance={14.0}
          enableRotate={true}
          enableDamping={true}
          dampingFactor={0.06}
          autoRotate={isAutoRotating}
          autoRotateSpeed={1.0}
          maxPolarAngle={Math.PI / 1.7}
          minPolarAngle={Math.PI / 2.4}
          touches={{
            ONE: THREE.TOUCH.ROTATE,
            TWO: THREE.TOUCH.DOLLY_PAN,
          }}
        />
      </Canvas>

      {/* Mobile Sticky Lock Indicator */}
      <div className="lg:hidden absolute top-3 left-3 z-10 flex items-center gap-1.5 bg-[#0F172A]/85 backdrop-blur-md text-white text-[10px] font-mono px-2 py-1 rounded-md shadow-xs select-none">
        <FontAwesomeIcon icon={faLock} className="text-[9px] text-[#10B981]" />
        <span className="font-semibold tracking-wide">3D VIEW LOCKED</span>
      </div>

      {/* ── Overlay Viewport Controls ── */}
      <div className="absolute top-3 right-3 sm:top-4 sm:right-4 flex items-center gap-1.5 sm:gap-2 z-10">
        {/* Toggle Auto-Rotate */}
        <button
          type="button"
          onClick={() => setIsAutoRotating(!isAutoRotating)}
          title={isAutoRotating ? "Pause Rotation" : "Auto-Rotate View"}
          className={`h-7 sm:h-8 px-2.5 sm:px-3 rounded-lg text-xs font-semibold border flex items-center gap-1.5 transition-all shadow-xs backdrop-blur-md cursor-pointer ${
            isAutoRotating
              ? "bg-[#059669] text-white border-[#059669]"
              : "bg-white/90 hover:bg-white text-[#0F172A] border-[#CBD5E1]"
          }`}
        >
          <FontAwesomeIcon icon={isAutoRotating ? faPause : faPlay} className="text-[10px]" />
          <span>{isAutoRotating ? "Still" : "Spin"}</span>
        </button>

        {/* Reset Camera Angle */}
        <button
          type="button"
          onClick={handleResetCamera}
          title="Reset Camera View"
          className="h-7 sm:h-8 px-2 sm:px-2.5 rounded-lg text-xs font-semibold border bg-white/90 hover:bg-white text-[#0F172A] border-[#CBD5E1] transition-all shadow-xs backdrop-blur-md flex items-center gap-1.5 cursor-pointer"
        >
          <FontAwesomeIcon icon={faRotate} className="text-[10px]" />
          <span className="hidden sm:inline">Reset</span>
        </button>
      </div>

      {/* Helpful Hint Pill */}
      <div className="absolute bottom-2.5 left-2.5 sm:bottom-4 sm:left-4 flex items-center gap-1.5 sm:gap-2 bg-white/90 backdrop-blur-sm px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-lg border border-[#E2E8F0] text-[10px] sm:text-xs font-medium text-[#64748B] shadow-sm select-none">
        <span className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-[#059669] animate-pulse" />
        <span>Drag to rotate</span>
        <span className="hidden sm:inline">· Scroll to zoom</span>
      </div>
    </div>
  );
}

// Preload standard default font into browser memory for instant display
if (typeof window !== "undefined") {
  try {
    useLoader.preload(FontLoader, "/fonts/helvetiker_bold.typeface.json");
  } catch {}
}
