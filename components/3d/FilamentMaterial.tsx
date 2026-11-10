"use client";

// Maps filament color and material type to Three.js material properties

import { useMemo } from "react";
import * as THREE from "three";

interface FilamentMaterialProps {
  hexColor: string;
  materialType?: "PLA" | "PETG" | "TPU";
}

/** Returns MeshStandardMaterial props based on filament type */
export function useFilamentMaterial({
  hexColor,
  materialType = "PLA",
}: FilamentMaterialProps): { color: string; roughness: number; metalness: number } {
  return useMemo(() => {
    const presets: Record<string, { roughness: number; metalness: number }> = {
      PLA:  { roughness: 0.5, metalness: 0.1 },
      PETG: { roughness: 0.3, metalness: 0.3 },
      TPU:  { roughness: 0.8, metalness: 0.0 },
    };

    return {
      color: hexColor,
      ...presets[materialType],
    };
  }, [hexColor, materialType]);
}

export default function FilamentMaterial({
  hexColor,
  materialType = "PLA",
}: FilamentMaterialProps) {
  const props = useFilamentMaterial({ hexColor, materialType });
  return <meshStandardMaterial {...(props as any)} />;
}

