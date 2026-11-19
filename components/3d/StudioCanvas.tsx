"use client";

import { Canvas, useLoader } from "@react-three/fiber";
import { OrbitControls, Center } from "@react-three/drei";
import { useMemo, useRef, useState, Suspense } from "react";
import * as THREE from "three";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faPlay, faPause, faRotate, faLock } from "@fortawesome/free-solid-svg-icons";
import { FontLoader } from "three/examples/jsm/loaders/FontLoader.js";
import type { OrbitControls as OrbitControlsType } from "three-stdlib";
import {
  buildKeychainPlate,
  buildKeychainText,
  keychainText,
  BASE_DEPTH,
  TEXT_SINK,
} from "@/lib/keychain-geometry";

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
  const safeText = keychainText(text);
  const fontPath = `/fonts/${fontStyle}.typeface.json`;

  // Load font geometry
  const font = useLoader(FontLoader, fontPath);

  // Geometry is shared with lib/stl-generator.ts so the print matches this preview exactly
  const baseGeometry = useMemo(
    () => buildKeychainPlate(font, safeText, hasKeychainLoop),
    [safeText, font, hasKeychainLoop]
  );
  const frontGeometry = useMemo(() => buildKeychainText(font, safeText), [safeText, font]);

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
        <mesh geometry={frontGeometry} position={[0, 0, BASE_DEPTH - TEXT_SINK]} castShadow>
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
      <div className="lg:hidden absolute top-3 left-3 z-10 flex items-center gap-1.5 bg-primary-navy/85 backdrop-blur-md text-white text-[10px] font-mono px-2 py-1 rounded-md shadow-xs select-none">
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
              ? "bg-tertiary-sage text-white border-tertiary-sage"
              : "bg-white/90 hover:bg-white text-primary-navy border-border-subtle"
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
          className="h-7 sm:h-8 px-2 sm:px-2.5 rounded-lg text-xs font-semibold border bg-white/90 hover:bg-white text-primary-navy border-border-subtle transition-all shadow-xs backdrop-blur-md flex items-center gap-1.5 cursor-pointer"
        >
          <FontAwesomeIcon icon={faRotate} className="text-[10px]" />
          <span className="hidden sm:inline">Reset</span>
        </button>
      </div>

      {/* Helpful Hint Pill */}
      <div className="absolute bottom-2.5 left-2.5 sm:bottom-4 sm:left-4 flex items-center gap-1.5 sm:gap-2 bg-white/90 backdrop-blur-sm px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-lg border border-border text-[10px] sm:text-xs font-medium text-secondary-slate shadow-sm select-none">
        <span className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-tertiary-sage animate-pulse" />
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
