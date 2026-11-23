import * as THREE from "three";
import type { Font } from "three/examples/jsm/loaders/FontLoader.js";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";

// Single source of truth for keychain geometry, shared by the 3D preview
// (components/3d/StudioCanvas.tsx) and the print STL (lib/stl-generator.ts),
// so the customer prints exactly what they approved. Units are font units;
// the STL scales them to millimetres (1 unit = 16 mm).

/** Sizes in font units. The admin "3D Sizing" settings override them per product (keychainSize). */
export interface KeychainSize {
  textSize: number; // letter height
  textDepth: number; // how far the letters stand out
  baseDepth: number; // plate thickness
  border: number; // plate edge distance from the letters
  earRadius: number; // keyring ear
  holeRadius: number; // keyring hole
}
export const DEFAULT_SIZE: KeychainSize = {
  textSize: 1.2,
  textDepth: 0.18, // ≈ 2.9 mm
  baseDepth: 0.2, // ≈ 3.2 mm
  border: 0.11, // ≈ 1.8 mm
  earRadius: 0.25, // ≈ 2 mm wall around the hole
  holeRadius: 0.125, // ≈ 4 mm hole: fits common split rings
};
/** Admin setting name (in the style's config) and allowed range for each size. */
export const SIZE_SETTINGS: Record<keyof KeychainSize, { key: string; min: number; max: number }> = {
  textSize: { key: "fontSize", min: 0.8, max: 1.8 },
  textDepth: { key: "extrusionDepth", min: 0.1, max: 0.35 },
  baseDepth: { key: "baseDepth", min: 0.12, max: 0.4 },
  border: { key: "offsetRadius", min: 0.06, max: 0.3 },
  earRadius: { key: "earRadius", min: 0.16, max: 0.4 },
  holeRadius: { key: "holeRadius", min: 0.06, max: 0.2 },
};

/**
 * A product's sizes from its saved settings. A missing or out-of-range value (e.g. the old seed's
 * extrusionDepth: 4, in other units) falls back to the default, and the ear and hole are kept
 * printable whatever the sliders say.
 */
export function keychainSize(config: unknown): KeychainSize {
  const saved = (config ?? {}) as Record<string, unknown>;
  const size = { ...DEFAULT_SIZE };
  for (const name of Object.keys(SIZE_SETTINGS) as (keyof KeychainSize)[]) {
    const { key, min, max } = SIZE_SETTINGS[name];
    const v = Number(saved[key]);
    if (saved[key] !== undefined && saved[key] !== null && v >= min && v <= max) size[name] = v;
  }
  size.earRadius = Math.max(size.earRadius, size.border + 0.05); // the ear must reach past the border
  size.holeRadius = Math.min(size.holeRadius, size.earRadius - 0.06); // ≈ 1 mm wall around the hole
  return size;
}

/** The reverse of keychainSize: sizes under their admin setting names, for saving in a style's config. */
export function sizeConfig(size: KeychainSize): Record<string, number> {
  return Object.fromEntries((Object.keys(SIZE_SETTINGS) as (keyof KeychainSize)[]).map((name) => [SIZE_SETTINGS[name].key, size[name]]));
}

export const TEXT_SIZE = DEFAULT_SIZE.textSize;
export const BASE_DEPTH = DEFAULT_SIZE.baseDepth;
export const TEXT_DEPTH = DEFAULT_SIZE.textDepth;
export const TEXT_SINK = 0.008; // letters overlap the plate slightly so they fuse into one solid

export { keychainText, MAX_LINES, MAX_LINE_CHARS } from "./keychain-text";

const EAR_OFFSET = 0.14; // keyring centre, left of the plate edge
const GRID = 0.01; // distance-map cell (≈ 0.16 mm printed)
const MIN_INSIDE = 0.2; // inside corners rounded this much (≈ 3.2 mm): fills the notches between letters; > plate bevel, so it can't fold
const BAR_TOP = 0.5; // a gap between words is bridged by a bar from the baseline up to here (at text size 1.2)

type Pt = { x: number; y: number };

interface Line {
  text: string;
  shapes: THREE.Shape[];
  dx: number; // horizontal shift that centres this line under the widest one
  dy: number; // baseline: 0 for the first line, then 1.2 × text size lower per line
}

/** Sampled outline points of one line (or of the keyring ear), in final position. */
interface Part {
  pts: THREE.Vector2[];
  minX: number;
  maxX: number;
}

const MIN_EDGE = 0.02; // ≈ 0.3 mm printed: below nozzle size, and shorter edges fold the letter bevel
const PLATE_MIN_EDGE = 0.008; // plate outline: drops duplicate / near-duplicate points

/** Polygon of a glyph path with points closer than MIN_EDGE dropped (curves sampled finely first). */
function cleanPoints(path: THREE.Path): THREE.Vector2[] {
  const out: THREE.Vector2[] = [];
  for (const p of path.getPoints(16)) if (!out.length || p.distanceTo(out[out.length - 1]) >= MIN_EDGE) out.push(p);
  while (out.length > 3 && out[out.length - 1].distanceTo(out[0]) < MIN_EDGE) out.pop(); // the closing edge too
  return out;
}

/**
 * Glyph shapes rebuilt as clean polygons. Some fonts have edges shorter than the letter bevel
 * (e.g. inside Captain's "R"); the bevel folds over them and the STL gets non-manifold edges.
 */
function cleanShapes(shapes: THREE.Shape[]): THREE.Shape[] {
  // A contour smaller than MIN_EDGE cleans down to < 3 points: too small to print, and it would
  // break the outline sampling (e.g. a tiny counter in Muctar), so it is dropped
  return shapes.flatMap((s) => {
    const outer = cleanPoints(s);
    if (outer.length < 3) return [];
    const shape = new THREE.Shape(outer);
    shape.holes = s.holes.map(cleanPoints).filter((h) => h.length >= 3).map((h) => new THREE.Path(h));
    return [shape];
  });
}

function layoutLines(font: Font, safeText: string, textSize: number): Line[] {
  const raw = safeText.split("\n").map((text) => {
    const shapes = cleanShapes(font.generateShapes(text, textSize));
    let width = 0;
    shapes.forEach((s) => s.getPoints().forEach((p) => (width = Math.max(width, p.x))));
    return { text, shapes, width };
  });
  const widest = Math.max(...raw.map((l) => l.width));
  return raw.map((l, i) => ({ text: l.text, shapes: l.shapes, dx: (widest - l.width) / 2, dy: -i * textSize * 1.2 }));
}

function samplePart(pts: THREE.Vector2[]): Part {
  const box = new THREE.Box2().setFromPoints(pts);
  return { pts, minX: box.min.x, maxX: box.max.x };
}

// Where segment pq properly crosses segment rs, or null.
function crossing(p: Pt, q: Pt, r: Pt, s: Pt): Pt | null {
  const d = (q.x - p.x) * (s.y - r.y) - (q.y - p.y) * (s.x - r.x);
  if (Math.abs(d) < 1e-12) return null;
  const t = ((r.x - p.x) * (s.y - r.y) - (r.y - p.y) * (s.x - r.x)) / d;
  const u = ((r.x - p.x) * (q.y - p.y) - (r.y - p.y) * (q.x - p.x)) / d;
  return t > 1e-9 && t < 1 - 1e-9 && u > 1e-9 && u < 1 - 1e-9 ? { x: p.x + t * (q.x - p.x), y: p.y + t * (q.y - p.y) } : null;
}

/**
 * Cuts off the tiny loops where the outline folds back on itself (where a flank meets an
 * envelope, or the smoothing kinks a sharp corner). Folds span a few samples, so only
 * nearby segments are compared. A self-crossing outline extrudes to a broken solid.
 */
function removeLocalLoops(input: Pt[], window = 8): Pt[] {
  let pts = input;
  for (let guard = 0; guard < 200; guard++) {
    const n = pts.length;
    let fixed = false;
    search: for (let i = 0; i < n && !fixed; i++) {
      for (let k = 2; k <= window && k < n - 1; k++) {
        const j = (i + k) % n;
        const hit = crossing(pts[i], pts[(i + 1) % n], pts[j], pts[(j + 1) % n]);
        if (!hit) continue;
        // drop the points inside the loop (i+1 … j) and close it at the crossing
        pts = j > i ? [...pts.slice(0, i + 1), hit, ...pts.slice(j + 1)] : [hit, ...pts.slice(j + 1, i + 1)];
        fixed = true;
        break search;
      }
    }
    if (!fixed) return pts;
  }
  return pts;
}

const dist = (a: Pt, b: Pt) => Math.hypot(a.x - b.x, a.y - b.y);

/**
 * Evenly spaced points around a glyph outline or counter. Font paths often leave the last edge
 * implicit (no segment back to the start), and getSpacedPoints skips it: for a block "I" that
 * edge is the whole left side, so the plate came out cut into the letter.
 */
function outlinePoints(path: THREE.Path, divisions: number): THREE.Vector2[] {
  const curves = path.curves;
  const start = curves[0]?.getPoint(0);
  const end = curves[curves.length - 1]?.getPoint(1);
  if (start && end && !start.equals(end)) path.closePath();
  return path.getSpacedPoints(divisions);
}

/**
 * Index of a point where the outline doubles back (turns more than 150° within `reach`
 * along the outline on each side): the tip of a hair-thin spike or slit, or -1.
 */
export function findSpike(pts: Pt[], reach = 0.05): number {
  const n = pts.length;
  const at = (i: number) => pts[((i % n) + n) % n];
  const limit = Math.cos((150 * Math.PI) / 180);
  for (let i = 0; i < n; i++) {
    let a = i, b = i, la = 0, lb = 0;
    while (la < reach && a > i - n) la += dist(at(a), at(--a));
    while (lb < reach && b < i + n) lb += dist(at(b), at(++b));
    const P = at(a), C = pts[i], N = at(b);
    const v1x = C.x - P.x, v1y = C.y - P.y, v2x = N.x - C.x, v2y = N.y - C.y;
    const len = Math.hypot(v1x, v1y) * Math.hypot(v2x, v2y);
    if (len > 0 && (v1x * v2x + v1y * v2y) / len < limit) return i;
  }
  return -1;
}

// Removes hair-thin spikes and slits: they render as "wings" and are too thin to print.
function removeSpikes(input: Pt[]): Pt[] {
  let pts = input;
  for (let guard = 0; guard < 500 && pts.length > 8; guard++) {
    const i = findSpike(pts);
    if (i < 0) break;
    pts = pts.filter((_, j) => j !== i);
  }
  return pts;
}

/** Cleans the outline (folds, spikes, small zig-zags) and builds the shape with the keyring hole. */
function finishPlate(outline: Pt[], hole: Pt | null, holeRadius: number): THREE.Shape {
  // Light smoothing over the closed outline irons out small zig-zags (they read as
  // "ticks"); it moves the edge only by hundredths of a unit.
  let clean = removeSpikes(removeLocalLoops(outline));
  for (let pass = 0; pass < 4; pass++) {
    const prev = clean;
    clean = prev.map((p, i) => {
      const a = prev[(i - 1 + prev.length) % prev.length], b = prev[(i + 1) % prev.length];
      return { x: 0.25 * a.x + 0.5 * p.x + 0.25 * b.x, y: 0.25 * a.y + 0.5 * p.y + 0.25 * b.y };
    });
  }
  // Points closer than the plate bevel make it fold over itself: a non-manifold STL
  const spaced: Pt[] = [];
  for (const p of clean) if (!spaced.length || dist(p, spaced[spaced.length - 1]) >= PLATE_MIN_EDGE) spaced.push(p);
  while (spaced.length > 3 && dist(spaced[spaced.length - 1], spaced[0]) < PLATE_MIN_EDGE) spaced.pop();
  clean = removeSpikes(removeLocalLoops(spaced));
  const plate = new THREE.Shape();
  plate.moveTo(clean[0].x, clean[0].y);
  for (let i = 1; i < clean.length; i++) plate.lineTo(clean[i].x, clean[i].y);
  plate.closePath();
  if (hole) {
    const path = new THREE.Path();
    path.absarc(hole.x, hole.y, holeRadius, 0, Math.PI * 2, true);
    plate.holes.push(path);
  }
  return plate;
}

/** Contour baseplate: per-letter silhouette with optional keyring ear + hole, flat back at z = 0. */
export function buildKeychainPlate(
  font: Font,
  safeText: string,
  hasKeychainLoop: boolean,
  size: KeychainSize = DEFAULT_SIZE
): THREE.ExtrudeGeometry {
  const geom = new THREE.ExtrudeGeometry(keychainPlateShape(font, safeText, hasKeychainLoop, size), {
    depth: size.baseDepth,
    curveSegments: 28,
    bevelEnabled: true,
    bevelThickness: 0.024,
    bevelSize: 0.02,
    bevelSegments: 4,
  });

  // Flatten rear vertices to z = 0 for a 100% planar flat back
  const pos = geom.attributes.position;
  for (let i = 0; i < pos.count; i++) if (pos.getZ(i) < 0) pos.setZ(i, 0);
  geom.computeVertexNormals();
  geom.computeBoundingBox();
  return geom;
}

/** The plate's 2D outline (and keyring hole), before extrusion. */
export function keychainPlateShape(
  font: Font,
  safeText: string,
  hasKeychainLoop: boolean,
  size: KeychainSize = DEFAULT_SIZE
): THREE.Shape {
  const lines = layoutLines(font, safeText, size.textSize);

  // Sample every letter outline (and counters) of every line, in final position.
  const parts = lines.map((line) => {
    const pts: THREE.Vector2[] = [];
    line.shapes.forEach((s) => {
      outlinePoints(s, 180).forEach((p) => pts.push(new THREE.Vector2(p.x + line.dx, p.y + line.dy)));
      s.holes.forEach((h) => {
        outlinePoints(h, 100).forEach((p) => pts.push(new THREE.Vector2(p.x + line.dx, p.y + line.dy)));
      });
    });
    return samplePart(pts);
  });

  return contourPlate(lines, parts, hasKeychainLoop, size);
}

/**
 * Squared distances (in cells) from every grid cell to the nearest `feature` cell: the exact
 * Euclidean distance transform of Felzenszwalb & Huttenlocher, one column/row pass at a time.
 */
function distanceMap(feature: Uint8Array, w: number, h: number): Float64Array {
  const INF = 1e20;
  const d = Float64Array.from(feature, (f) => (f ? 0 : INF));
  const n = Math.max(w, h);
  const f = new Float64Array(n), out = new Float64Array(n), z = new Float64Array(n + 1);
  const v = new Int32Array(n);
  const pass = (len: number, base: number, stride: number) => {
    for (let i = 0; i < len; i++) f[i] = d[base + i * stride];
    let k = 0;
    v[0] = 0;
    z[0] = -INF;
    z[1] = INF;
    for (let q = 1; q < len; q++) {
      let s = (f[q] + q * q - (f[v[k]] + v[k] * v[k])) / (2 * q - 2 * v[k]);
      while (s <= z[k]) {
        k--;
        s = (f[q] + q * q - (f[v[k]] + v[k] * v[k])) / (2 * q - 2 * v[k]);
      }
      k++;
      v[k] = q;
      z[k] = s;
      z[k + 1] = INF;
    }
    k = 0;
    for (let q = 0; q < len; q++) {
      while (z[k + 1] < q) k++;
      out[q] = (q - v[k]) ** 2 + f[v[k]];
    }
    for (let i = 0; i < len; i++) d[base + i * stride] = out[i];
  };
  for (let x = 0; x < w; x++) pass(h, x, w); // columns
  for (let y = 0; y < h; y++) pass(w, y * w, 1); // rows
  return d;
}

// Marching squares: for each inside/outside pattern of a cell's corners (bit 1 = bottom-left,
// 2 = bottom-right, 4 = top-right, 8 = top-left), the edges the contour joins (0 bottom,
// 1 right, 2 top, 3 left). Saddles 5 and 10 depend on the cell centre.
const SEGMENTS: Record<number, number[][]> = {
  1: [[3, 0]], 2: [[0, 1]], 3: [[3, 1]], 4: [[1, 2]], 6: [[0, 2]], 7: [[3, 2]], 8: [[2, 3]],
  9: [[0, 2]], 11: [[1, 2]], 12: [[1, 3]], 13: [[0, 1]], 14: [[0, 3]],
};

/** Longest closed contour where `field` (sampled on a w×h grid, positive inside) crosses 0. */
function outerContour(field: Float64Array, w: number, h: number, x0: number, y0: number): Pt[] {
  const at = (i: number, j: number) => field[j * w + i];
  // edge ids: 2k = from grid point k to its right neighbour, 2k+1 = to the one above
  const point = (e: number): Pt => {
    const k = e >> 1, i = k % w, j = (k - i) / w;
    const i2 = e & 1 ? i : i + 1, j2 = e & 1 ? j + 1 : j;
    const f1 = at(i, j), t = f1 / (f1 - at(i2, j2));
    return { x: x0 + (i + t * (i2 - i)) * GRID, y: y0 + (j + t * (j2 - j)) * GRID };
  };
  const links = new Map<number, number[]>();
  const link = (a: number, b: number) => {
    if (!links.has(a)) links.set(a, []);
    if (!links.has(b)) links.set(b, []);
    links.get(a)!.push(b);
    links.get(b)!.push(a);
  };
  for (let j = 0; j < h - 1; j++) {
    for (let i = 0; i < w - 1; i++) {
      const a = at(i, j), b = at(i + 1, j), c = at(i + 1, j + 1), d = at(i, j + 1);
      const code = (a > 0 ? 1 : 0) | (b > 0 ? 2 : 0) | (c > 0 ? 4 : 0) | (d > 0 ? 8 : 0);
      if (code === 0 || code === 15) continue;
      const k = j * w + i;
      const e = [2 * k, 2 * (k + 1) + 1, 2 * (k + w), 2 * k + 1]; // bottom, right, top, left
      const joined = (a + b + c + d) / 4 > 0; // saddle: are the two inside corners connected?
      const segs =
        code === 5 ? (joined ? [[0, 1], [2, 3]] : [[3, 0], [1, 2]])
        : code === 10 ? (joined ? [[3, 0], [1, 2]] : [[0, 1], [2, 3]])
        : SEGMENTS[code];
      for (const [p, q] of segs) link(e[p], e[q]);
    }
  }
  let best: number[] = [];
  const seen = new Set<number>();
  for (const start of links.keys()) {
    if (seen.has(start)) continue;
    const loop = [start];
    seen.add(start);
    let prev = start;
    let cur: number | undefined = links.get(start)![0];
    while (cur !== undefined && !seen.has(cur)) {
      loop.push(cur);
      seen.add(cur);
      const next: number | undefined = links.get(cur)!.find((n) => n !== prev);
      prev = cur;
      cur = next;
    }
    if (loop.length > best.length) best = loop;
  }
  return best.map(point);
}

/**
 * Labels the islands of the grown letters (squared distance ≤ limit, in cells) and, if there are several,
 * adds to `mask` baseline bars (each line's rows baseline…baseline + barTop) joining the islands
 * of a line from left to right. An island with no letter in any band (e.g. a detached dot) gets a
 * strip down into the band below it. Returns whether anything was added.
 */
function bridgeIslands(mask: Uint8Array, grown: Float64Array, limit: number, w: number, h: number, y0: number, baselines: number[], barTop: number): boolean {
  const label = new Int32Array(w * h).fill(-1);
  const islands: number[][] = []; // letter cells of each island
  for (let k0 = 0; k0 < w * h; k0++) {
    if (label[k0] >= 0 || grown[k0] > limit) continue;
    const id = islands.length, cells: number[] = [], stack = [k0];
    label[k0] = id;
    while (stack.length) {
      const k = stack.pop()!;
      if (mask[k]) cells.push(k);
      const i = k % w;
      for (const n of [i > 0 ? k - 1 : -1, i < w - 1 ? k + 1 : -1, k - w, k + w])
        if (n >= 0 && n < w * h && label[n] < 0 && grown[n] <= limit) {
          label[n] = id;
          stack.push(n);
        }
    }
    islands.push(cells);
  }
  if (islands.length < 2) return false;

  const row = (y: number) => Math.round((y - y0) / GRID);
  const bands = baselines.map((b) => [row(b), row(b + barTop)]);
  const spans = bands.map(() => [] as { lo: number; hi: number }[]); // per band: each island's columns in it
  for (const cells of islands) {
    let inAnyBand = false;
    bands.forEach(([r0, r1], b) => {
      let lo = Infinity, hi = -Infinity;
      for (const k of cells) {
        const j = Math.floor(k / w);
        if (j >= r0 && j <= r1) {
          lo = Math.min(lo, k % w);
          hi = Math.max(hi, k % w);
        }
      }
      if (lo !== Infinity) {
        spans[b].push({ lo, hi });
        inAnyBand = true;
      }
    });
    if (!inAnyBand) {
      // a strip from its lowest letter cell down into the nearest band below
      const low = cells.reduce((a, b) => (b < a ? b : a));
      const i = low % w, j = Math.floor(low / w);
      const below = bands.filter(([, r1]) => r1 <= j).sort((a, b) => b[1] - a[1])[0] ?? bands[0];
      for (let r = below[0]; r <= j; r++) for (let c = i - 2; c <= i + 2; c++) mask[r * w + c] = 1;
    }
  }
  bands.forEach(([r0, r1], b) => {
    const s = spans[b].sort((p, q) => p.lo - q.lo);
    for (let n = 1; n < s.length; n++) {
      const from = Math.min(s[n - 1].hi, s[n].lo), to = Math.max(s[n - 1].hi, s[n].lo);
      for (let r = r0; r <= r1; r++) for (let i = from; i <= to; i++) mask[r * w + i] = 1;
    }
  });
  return true;
}

/**
 * The plate: its edge is the same distance R from the lettering everywhere, like a sticker
 * contour. Built on a distance map of the letters and the keyring ear. Between two lines the gap
 * is filled across the width they share, so the plate is one piece; where the contour would
 * still fall apart (a space between words) a baseline bar bridges it. Counters are filled;
 * inside corners are rounded by MIN_INSIDE.
 */
function contourPlate(lines: Line[], parts: Part[], hasKeychainLoop: boolean, size: KeychainSize): THREE.Shape {
  const { border: R, earRadius: EAR_RADIUS } = size;
  const k = size.textSize / DEFAULT_SIZE.textSize; // heights below are for text size 1.2
  const barTop = BAR_TOP * k;
  const polys = lines.flatMap((line) =>
    line.shapes.map((s) =>
      [s.getPoints(), ...s.holes.map((h) => h.getPoints())].map((ring) => ring.map((p) => new THREE.Vector2(p.x + line.dx, p.y + line.dy)))
    )
  );
  const box = new THREE.Box2().setFromPoints(parts.flatMap((p) => p.pts));

  // Keyring: halfway up the first letter of the line reaching furthest left (kept to the middle
  // band of that line), just outside the plate edge there
  let hole: Pt | null = null;
  if (hasKeychainLoop) {
    const n = parts.reduce((a, _, i) => (parts[i].minX < parts[a].minX ? i : a), 0);
    const first = lines[n].shapes
      .map((s) => new THREE.Box2().setFromPoints(s.getPoints()))
      .reduce((a, b) => (b.min.x < a.min.x ? b : a));
    const earY = lines[n].dy + Math.max(0.48 * k, Math.min(0.65 * k, (first.min.y + first.max.y) / 2));
    let edgeX = Infinity;
    for (const p of parts.flatMap((q) => q.pts)) {
      const dy = Math.abs(p.y - earY);
      if (dy <= R) edgeX = Math.min(edgeX, p.x - Math.sqrt(R * R - dy * dy));
    }
    if (!Number.isFinite(edgeX)) edgeX = box.min.x - R;
    hole = { x: edgeX - EAR_OFFSET, y: earY };
  }

  const pad = R + MIN_INSIDE + 4 * GRID;
  const x0 = Math.min(box.min.x, hole ? hole.x - EAR_RADIUS : Infinity) - pad;
  const y0 = Math.min(box.min.y, hole ? hole.y - EAR_RADIUS : Infinity) - pad;
  const w = Math.ceil((Math.max(box.max.x, hole ? hole.x + EAR_RADIUS : -Infinity) + pad - x0) / GRID) + 1;
  const h = Math.ceil((Math.max(box.max.y, hole ? hole.y + EAR_RADIUS : -Infinity) + pad - y0) / GRID) + 1;

  // 1. What the plate grows from: the letters (each shape even-odd, so counters stay open),
  //    the ear, and the gap between each pair of lines across their shared width
  const mask = new Uint8Array(w * h);
  const fillRow = (j: number, from: number, to: number) => {
    const last = Math.min(w - 1, Math.floor((to - x0) / GRID));
    for (let i = Math.max(0, Math.ceil((from - x0) / GRID)); i <= last; i++) mask[j * w + i] = 1;
  };
  for (let j = 0; j < h; j++) {
    const y = y0 + j * GRID;
    for (const rings of polys) {
      const xs: number[] = [];
      for (const ring of rings)
        for (let k = 0; k < ring.length; k++) {
          const a = ring[k], b = ring[(k + 1) % ring.length];
          if (a.y > y !== b.y > y) xs.push(a.x + ((y - a.y) * (b.x - a.x)) / (b.y - a.y));
        }
      xs.sort((p, q) => p - q);
      for (let k = 0; k + 1 < xs.length; k += 2) fillRow(j, xs[k], xs[k + 1]);
    }
    // only the gap: from halfway up the lower line's letters to just into the upper line's,
    // so both lines keep their contour everywhere else
    for (let n = 1; n < lines.length; n++) {
      if (y >= lines[n].dy + barTop && y <= lines[n - 1].dy + 0.1 * k)
        fillRow(j, Math.max(parts[n - 1].minX, parts[n].minX), Math.min(parts[n - 1].maxX, parts[n].maxX));
    }
    if (hole && Math.abs(y - hole.y) < EAR_RADIUS - R) {
      const dx = Math.sqrt((EAR_RADIUS - R) ** 2 - (y - hole.y) ** 2); // + the R offset = EAR_RADIUS
      fillRow(j, hole.x - dx, hole.x + dx);
    }
  }

  // 2. Grow by R + MIN_INSIDE, then shrink by MIN_INSIDE: an offset of exactly R whose inside
  //    corners are rounded (a morphological closing)
  const limit = ((R + MIN_INSIDE) / GRID) ** 2;
  let grown = distanceMap(mask, w, h);

  // Parts whose border (R) doesn't join them (words, or a "T" whose bar hangs over a short "o")
  // are joined by a bar along their line's baseline, each to the next from left to right.
  // Judged at R, not R + MIN_INSIDE: the shrink step would pull such a join apart again.
  if (bridgeIslands(mask, grown, (R / GRID) ** 2, w, h, y0, lines.map((l) => l.dy), barTop)) grown = distanceMap(mask, w, h);

  const outside = Uint8Array.from(grown, (d2) => (d2 > limit ? 1 : 0));
  const field = Float64Array.from(distanceMap(outside, w, h), (d2) => Math.sqrt(d2) * GRID - MIN_INSIDE);

  // 3. Trace the edge; every other point (≈ 0.01 apart) is still finer than any printer
  const outline = outerContour(field, w, h, x0, y0).filter((_, i) => i % 2 === 0);
  return finishPlate(outline, hole, size.holeRadius);
}

/** Embossed lettering (all lines, centred), sitting on z = 0; place it at baseDepth - TEXT_SINK. */
export function buildKeychainText(font: Font, safeText: string, size: KeychainSize = DEFAULT_SIZE): THREE.BufferGeometry {
  const parts = layoutLines(font, safeText, size.textSize).map((line) =>
    new THREE.ExtrudeGeometry(line.shapes, {
      depth: size.textDepth,
      curveSegments: 32,
      bevelEnabled: true,
      bevelThickness: 0.022,
      bevelSize: 0.018,
      bevelSegments: 5,
    }).translate(line.dx, line.dy, 0)
  );
  const geom = parts.length === 1 ? parts[0] : mergeGeometries(parts)!;
  geom.computeVertexNormals();
  geom.computeBoundingBox();
  return geom;
}
