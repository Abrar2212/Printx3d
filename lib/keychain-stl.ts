import * as THREE from "three";
import type { Font } from "three/examples/jsm/loaders/FontLoader.js";
import { STLExporter } from "three/examples/jsm/exporters/STLExporter.js";
import { buildKeychainPlate, buildKeychainText, keychainText, BASE_DEPTH, TEXT_SINK } from "./keychain-geometry";

/**
 * Print-ready binary STL of the two-tone keychain, in millimetres, centred on the bed with its
 * flat back on z = 0. No Node APIs: used by the server (lib/stl-generator.ts) and in the browser
 * (WordPress plugin admin), so both produce the same file as the customer's preview.
 */
export function keychainSTL(font: Font, text: string, hasKeychainLoop = true, scale = 16): DataView {
  const safeText = keychainText(text);
  const group = new THREE.Group();
  group.add(new THREE.Mesh(buildKeychainPlate(font, safeText, hasKeychainLoop)));
  const letters = new THREE.Mesh(buildKeychainText(font, safeText));
  letters.position.set(0, 0, BASE_DEPTH - TEXT_SINK);
  group.add(letters);
  group.scale.setScalar(scale); // font units → mm (thickness, border and hole sizes live in keychain-geometry.ts)

  const bbox = new THREE.Box3().setFromObject(group);
  const center = bbox.getCenter(new THREE.Vector3());
  group.position.set(-center.x, -center.y, -bbox.min.z);
  group.updateMatrixWorld(true);

  return new STLExporter().parse(group, { binary: true });
}
