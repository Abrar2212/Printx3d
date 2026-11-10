"use client";

// Extruded 3D text mesh rendered via Three.js TextGeometry
// Requires: npm install three @react-three/fiber @react-three/drei

import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { Text3D, Center } from "@react-three/drei";

interface TextMeshProps {
  text: string;
  fontPath: string;    // path to typeface.json
  color: string;       // hex color
  extrusionDepth?: number;
  bevel?: number;
}

export default function TextMesh({
  text,
  fontPath,
  color,
  extrusionDepth = 6,
  bevel = 0.5,
}: TextMeshProps) {
  const meshRef = useRef<THREE.Mesh>(null);

  // Memoize so geometry isn't rebuilt on every render
  const matProps = useMemo(
    () => ({ color, roughness: 0.3, metalness: 0.4 }),
    [color]
  );

  return (
    <Center>
      <Text3D
        ref={meshRef}
        font={fontPath}
        size={1.5}
        height={extrusionDepth / 10}
        bevelEnabled
        bevelSize={bevel / 10}
        bevelThickness={0.05}
      >
        {text}
        <meshStandardMaterial {...matProps} />
      </Text3D>
    </Center>
  );
}

