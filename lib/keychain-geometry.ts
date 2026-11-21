import * as THREE from "three";
import type { Font } from "three/examples/jsm/loaders/FontLoader.js";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";

// Single source of truth for keychain geometry, shared by the 3D preview
// (components/3d/StudioCanvas.tsx) and the print STL (lib/stl-generator.ts),
// so the customer prints exactly what they approved. Units are font units;
// the STL scales them to millimetres.
export const TEXT_SIZE = 1.2;
export const BASE_DEPTH = 0.2;
export const TEXT_DEPTH = 0.18;
export const TEXT_SINK = 0.008; // letters overlap the plate slightly so they fuse into one solid

export { keychainText, MAX_LINES, MAX_LINE_CHARS } from "./keychain-text";
const LINE_HEIGHT = TEXT_SIZE * 1.2;

const R = 0.11; // plate margin around the letters (≈ 1.8 mm printed)
const STEP = 0.015; // outline sampling step
const EAR_RADIUS = 0.25; // ≈ 2 mm wall around the hole
const HOLE_RADIUS = 0.125; // ≈ 4 mm hole printed: fits common split rings
const EAR_OFFSET = 0.14; // keyring centre, left of the plate edge
const FILLET = 0.6; // multi-line: radius of the rounded joins between lines (≈ 10 mm printed)
const NOTCH_DEPTH = 0.07; // single line: notches shallower than this (≈ 1.1 mm) are filled; real height steps are deeper
const NOTCH_REACH = 30; // samples (≈ 0.45 units) looked at on each side of a notch

type Pt = { x: number; y: number };

interface Line {
  text: string;
  shapes: THREE.Shape[];
  dx: number; // horizontal shift that centres this line under the widest one
  dy: number; // baseline: 0 for the first line, then one LINE_HEIGHT lower per line
}

/** Sampled outline points of one line (or of the keyring ear), in final position. */
interface Part {
  pts: THREE.Vector2[];
  minX: number;
  maxX: number;
  /** Baseline, for the default heights used at word gaps; null for the keyring ear. */
  dy: number | null;
}

const MIN_EDGE = 0.02; // ≈ 0.3 mm printed: below nozzle size, and shorter edges fold the letter bevel
const PLATE_MIN_EDGE = 0.008; // plate outline: drops duplicate / near-duplicate points
const MIN_INSIDE_RADIUS = 0.35; // single line: inside corners (gaps between letters) rounded this much (≈ 5.6 mm printed), keeps gaps shallow and the plate bevel from folding

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
  return shapes.map((s) => {
    const shape = new THREE.Shape(cleanPoints(s));
    shape.holes = s.holes.map((h) => new THREE.Path(cleanPoints(h)));
    return shape;
  });
}

function layoutLines(font: Font, safeText: string): Line[] {
  const raw = safeText.split("\n").map((text) => {
    const shapes = cleanShapes(font.generateShapes(text, TEXT_SIZE));
    let width = 0;
    shapes.forEach((s) => s.getPoints().forEach((p) => (width = Math.max(width, p.x))));
    return { text, shapes, width };
  });
  const widest = Math.max(...raw.map((l) => l.width));
  return raw.map((l, i) => ({ text: l.text, shapes: l.shapes, dx: (widest - l.width) / 2, dy: -i * LINE_HEIGHT }));
}

function samplePart(pts: THREE.Vector2[], dy: number | null): Part {
  const box = new THREE.Box2().setFromPoints(pts);
  return { pts, minX: box.min.x, maxX: box.max.x, dy };
}

// Smoothing passes used for the outline (three passes of a small blur kernel).
function smooth(values: number[], side: number, centre: number): number[] {
  let curr = values;
  for (let pass = 0; pass < 3; pass++) {
    curr = curr.map((v, i) =>
      i === 0 || i === curr.length - 1 ? v : side * curr[i - 1] + centre * v + side * curr[i + 1]
    );
  }
  return curr;
}

// Fills thin gaps (e.g. between letters) by taking the extreme value over ±3 samples.
function bridge(values: number[], pick: (a: number, b: number) => number): number[] {
  const span = 3;
  return values.map((_, i) => {
    let m = values[i];
    for (let j = Math.max(0, i - span); j <= Math.min(values.length - 1, i + span); j++) m = pick(m, values[j]);
    return m;
  });
}

/**
 * Rounds inside corners of a lower envelope (plate above `f`, sampled every `step`), such as
 * where a wide line sits on a narrower one, with radius `r`. This is a morphological
 * closing of the plate by a disc: it only ever adds plate (result ≤ f), never removes it.
 * Beyond both ends there is no plate. For an upper envelope negate values in and out.
 */
export function filletInsideCorners(f: number[], step: number, r: number): number[] {
  const k = Math.round(r / step);
  const disc = Array.from({ length: 2 * k + 1 }, (_, j) => Math.sqrt(Math.max(0, r * r - ((j - k) * step) ** 2)));
  const padded = [...Array(k).fill(Infinity), ...f, ...Array(k).fill(Infinity)]; // all air outside
  // erode the air below the plate, then dilate it back: sharp air corners don't come back
  const eroded = padded.map((_, i) => {
    let m = Infinity;
    for (let j = -k; j <= k; j++) if (i + j >= 0 && i + j < padded.length) m = Math.min(m, padded[i + j] - disc[j + k]);
    return m;
  });
  return f.map((_, n) => {
    let m = -Infinity;
    for (let j = -k; j <= k; j++) m = Math.max(m, eroded[n + k + j] + disc[j + k]);
    return Math.min(m, f[n]); // never above the input (also when the end is all air)
  });
}

/**
 * Fills shallow notches in a lower envelope (plate above `f`), e.g. where two rounded letter
 * corners meet: a point is raised to the lower of the two levels found within `reach` samples
 * on each side, if that is less than `depth` away. Only ever adds plate (result ≤ f).
 * For an upper envelope negate values in and out.
 */
export function fillShallowNotches(f: number[], reach = NOTCH_REACH, depth = NOTCH_DEPTH): number[] {
  return f.map((v, i) => {
    let left = v, right = v;
    for (let j = Math.max(0, i - reach); j < i; j++) left = Math.min(left, f[j]);
    for (let j = i + 1; j <= Math.min(f.length - 1, i + reach); j++) right = Math.min(right, f[j]);
    const level = Math.max(left, right);
    return v - level < depth ? level : v;
  });
}

/**
 * Outer offset of the parts at x: highest (up) or lowest point of any part covering x,
 * pushed out by R. A line with a gap at x (e.g. a space) falls back to its own default
 * height, so the plate stays solid between words. NaN where nothing covers x.
 */
function envelopeAt(parts: Part[], x: number, up: boolean): number {
  let best = up ? -Infinity : Infinity;
  for (const part of parts) {
    if (x < part.minX - R || x > part.maxX + R) continue;
    let v = up ? -Infinity : Infinity;
    for (const p of part.pts) {
      const dx = Math.abs(x - p.x);
      if (dx <= R) {
        const d = Math.sqrt(Math.max(0, R * R - dx * dx));
        v = up ? Math.max(v, p.y + d) : Math.min(v, p.y - d);
      }
    }
    if (part.dy !== null) {
      if (!Number.isFinite(v)) v = part.dy + (up ? 0.6 : -(R - 0.02));
      if (!up && v > part.dy - 0.06) v = part.dy - 0.06;
    }
    if (Number.isFinite(v)) best = up ? Math.max(best, v) : Math.min(best, v);
  }
  return Number.isFinite(best) ? best : NaN;
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
function finishPlate(outline: Pt[], hole: Pt | null): THREE.Shape {
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
    path.absarc(hole.x, hole.y, HOLE_RADIUS, 0, Math.PI * 2, true);
    plate.holes.push(path);
  }
  return plate;
}

/** Contour baseplate: per-letter silhouette with optional keyring ear + hole, flat back at z = 0. */
export function buildKeychainPlate(font: Font, safeText: string, hasKeychainLoop: boolean): THREE.ExtrudeGeometry {
  const geom = new THREE.ExtrudeGeometry(keychainPlateShape(font, safeText, hasKeychainLoop), {
    depth: BASE_DEPTH,
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
export function keychainPlateShape(font: Font, safeText: string, hasKeychainLoop: boolean): THREE.Shape {
  const lines = layoutLines(font, safeText);

  // Sample every letter outline (and counters) of every line, in final position.
  const parts = lines.map((line) => {
    const pts: THREE.Vector2[] = [];
    line.shapes.forEach((s) => {
      outlinePoints(s, 180).forEach((p) => pts.push(new THREE.Vector2(p.x + line.dx, p.y + line.dy)));
      s.holes.forEach((h) => {
        outlinePoints(h, 100).forEach((p) => pts.push(new THREE.Vector2(p.x + line.dx, p.y + line.dy)));
      });
    });
    return samplePart(pts, line.dy);
  });

  return lines.length > 1
    ? multiLinePlate(parts, hasKeychainLoop)
    : singleLinePlate(font, safeText, parts[0], hasKeychainLoop);
}

/**
 * Several lines: the plate is everything between one bottom and one top envelope, sampled
 * from the keyring on the left to the far right. Being one x-monotone band it can't cross
 * itself, its ends round off by themselves, and shorter or inset lines need no special
 * cases. Inside corners where lines of different length meet are rounded (FILLET).
 */
function multiLinePlate(lines: Part[], hasKeychainLoop: boolean): THREE.Shape {
  const all = lines.flatMap((l) => l.pts);
  const parts = [...lines];

  // Keyring: halfway up the line that reaches furthest left, just outside the plate edge there.
  let hole: Pt | null = null;
  if (hasKeychainLoop) {
    const leftLine = lines.reduce((a, b) => (b.minX < a.minX ? b : a));
    const box = new THREE.Box2().setFromPoints(leftLine.pts);
    const earY = (box.min.y + box.max.y) / 2;
    let edgeX = Infinity;
    for (const p of all) {
      const dy = Math.abs(p.y - earY);
      if (dy <= R) edgeX = Math.min(edgeX, p.x - Math.sqrt(R * R - dy * dy));
    }
    if (!Number.isFinite(edgeX)) edgeX = leftLine.minX - R;
    hole = { x: edgeX - EAR_OFFSET, y: earY };
    // the ear joins the envelopes as a ring of points; the R offset brings it to EAR_RADIUS
    const ring = Array.from({ length: 48 }, (_, i) => {
      const a = (i / 48) * Math.PI * 2;
      return new THREE.Vector2(hole!.x + Math.cos(a) * (EAR_RADIUS - R), hole!.y + Math.sin(a) * (EAR_RADIUS - R));
    });
    parts.push(samplePart(ring, null));
  }

  const minX = Math.min(...parts.map((p) => p.minX)) - R;
  const maxX = Math.max(...parts.map((p) => p.maxX)) + R;
  const xs: number[] = [];
  for (let x = minX; x <= maxX + 0.0001; x += STEP) xs.push(+x.toFixed(4));

  const rawLower = xs.map((x) => envelopeAt(parts, x, false));
  const rawUpper = xs.map((x) => envelopeAt(parts, x, true));
  const keep = xs.map((_, i) => Number.isFinite(rawLower[i]) && Number.isFinite(rawUpper[i]));
  const X = xs.filter((_, i) => keep[i]);

  let lower = smooth(bridge(rawLower.filter((_, i) => keep[i]), Math.min), 0.2, 0.6);
  let upper = smooth(bridge(rawUpper.filter((_, i) => keep[i]), Math.max), 0.2, 0.6);
  lower = filletInsideCorners(lower, STEP, FILLET);
  upper = filletInsideCorners(upper.map((v) => -v), STEP, FILLET).map((v) => -v);

  const bottom = X.map((x, i) => ({ x, y: Math.min(lower[i], upper[i]) }));
  const top = X.map((x, i) => ({ x, y: Math.max(lower[i], upper[i]) }));
  return finishPlate([...bottom, ...top.reverse()], hole);
}

/** One line: bottom/top envelopes plus flanks that follow the first and last letter. */
function singleLinePlate(font: Font, safeText: string, line: Part, hasKeychainLoop: boolean): THREE.Shape {
  const letterPts = line.pts;
  const rawBBox = new THREE.Box2().setFromPoints(letterPts);

  const firstBox = new THREE.Box2();
  const firstPts: THREE.Vector2[] = [];
  font.generateShapes(safeText[0] || "A", TEXT_SIZE).forEach((s) =>
    outlinePoints(s, 150).forEach((p) => {
      firstBox.expandByPoint(p);
      firstPts.push(p);
    })
  );
  const lastBox = new THREE.Box2();
  const rawLast: THREE.Vector2[] = [];
  font.generateShapes(safeText[safeText.length - 1] || "A", TEXT_SIZE).forEach((s) =>
    outlinePoints(s, 150).forEach((p) => {
      lastBox.expandByPoint(p);
      rawLast.push(p);
    })
  );
  const lastCharOffset = rawBBox.max.x - lastBox.max.x;
  const lastPts = rawLast.map((p) => new THREE.Vector2(p.x + lastCharOffset, p.y));

  let firstTopPt = firstPts[0];
  let firstBottomPt = firstPts[0];
  for (const p of firstPts) {
    // highest point, leftmost among equals: a flat top (T, E) must start at its left corner
    if (p.y > firstTopPt.y + 1e-4 || (Math.abs(p.y - firstTopPt.y) <= 1e-4 && p.x < firstTopPt.x)) firstTopPt = p;
    if (p.x < firstBottomPt.x) firstBottomPt = p;
  }
  let lastRightPt = lastPts[0];
  for (const p of lastPts) if (p.x > lastRightPt.x) lastRightPt = p;

  const samplesFrom = (start: number, end: number) => {
    const xs: number[] = [];
    for (let x = start; x <= end + 0.0001; x += STEP) xs.push(+x.toFixed(4));
    return xs;
  };
  const env = (x: number, up: boolean) => {
    const v = envelopeAt([line], x, up);
    return Number.isFinite(v) ? v : up ? 0.6 : -(R - 0.02);
  };

  // 1. Bottom and 2. top envelopes
  const bottomXSamples = samplesFrom(firstBottomPt.x, lastRightPt.x);
  const smoothLower = filletInsideCorners(
    smooth(fillShallowNotches(bridge(bottomXSamples.map((x) => env(x, false)), Math.min)), 0.2, 0.6),
    STEP,
    MIN_INSIDE_RADIUS
  );
  const topXSamples = samplesFrom(firstTopPt.x, lastRightPt.x);
  const smoothUpper = filletInsideCorners(
    smooth(fillShallowNotches(bridge(topXSamples.map((x) => -env(x, true)), Math.min)), 0.2, 0.6),
    STEP,
    MIN_INSIDE_RADIUS
  ).map((v) => -v);

  // Flank: outermost x of `pts` at each height, from the bottom envelope to the top one.
  const stepY = 0.015;
  const flank = (pts: THREE.Vector2[], yFrom: number, yTo: number, right: boolean, fallbackX: number) => {
    const out: Pt[] = [];
    for (let y = yFrom; y <= yTo + 0.0001; y += stepY) {
      let x = right ? -Infinity : Infinity;
      for (const p of pts) {
        const dy = Math.abs(y - p.y);
        if (dy <= R) {
          const d = Math.sqrt(Math.max(0, R * R - dy * dy));
          x = right ? Math.max(x, p.x + d) : Math.min(x, p.x - d);
        }
      }
      out.push({ x: Number.isFinite(x) ? x : fallbackX, y: +y.toFixed(4) });
    }
    return out;
  };
  const smoothX = (pts: Pt[], side: number, centre: number) => {
    const xs = smooth(
      pts.map((p) => p.x),
      side,
      centre
    );
    return pts.map((p, i) => ({ x: xs[i], y: p.y }));
  };

  // 3. Right flank
  const smoothRight = smoothX(
    flank(lastPts, smoothLower[smoothLower.length - 1], smoothUpper[smoothUpper.length - 1], true, lastRightPt.x + R),
    0.2,
    0.6
  );

  // 4. Left flank, with the keyring ear
  const yTopLeft = smoothUpper[0];
  const yBottomLeft = smoothLower[0];
  const earY = Math.max(0.48, Math.min(0.65, (firstBox.max.y + firstBox.min.y) / 2));
  const leftSamples = flank(firstPts, yBottomLeft, yTopLeft, false, firstBox.min.x - R);

  let contourXAtEar = firstBox.min.x - R;
  let minDiff = Infinity;
  for (const lp of leftSamples) {
    const diff = Math.abs(lp.y - earY);
    if (diff < minDiff) {
      minDiff = diff;
      contourXAtEar = lp.x;
    }
  }
  const earX = contourXAtEar - EAR_OFFSET;

  const leftWithEar = leftSamples.map((lp) => {
    const dy = Math.abs(lp.y - earY);
    if (!hasKeychainLoop || dy >= EAR_RADIUS) return lp;
    return { x: Math.min(lp.x, earX - Math.sqrt(EAR_RADIUS * EAR_RADIUS - dy * dy)), y: lp.y };
  });
  const smoothLeft = smoothX(leftWithEar, 0.15, 0.7);

  // At each corner, where a flank starts inside the end of an envelope, trim the envelope
  // back to the flank. Otherwise the outline folds back over itself (a broken solid) or,
  // if pushed outward, leaves a small hook.
  const lf0 = smoothLeft[0].x, lfN = smoothLeft[smoothLeft.length - 1].x;
  const rf0 = smoothRight[0].x, rfN = smoothRight[smoothRight.length - 1].x;
  const trim = (edge: Pt[], minX: number, maxX: number) => {
    const kept = edge.filter((p) => p.x >= minX && p.x <= maxX);
    return kept.length >= 2 ? kept : edge;
  };
  const bottom = trim(bottomXSamples.map((x, i) => ({ x, y: smoothLower[i] })), lf0, rf0);
  const top = trim(topXSamples.map((x, i) => ({ x, y: smoothUpper[i] })), lfN, rfN);

  // 5. bottom → right flank → top (reversed) → left flank (reversed)
  return finishPlate(
    [...bottom, ...smoothRight, ...top.reverse(), ...[...smoothLeft].reverse()],
    hasKeychainLoop ? { x: earX, y: earY } : null
  );
}

/** Embossed lettering (all lines, centred), sitting on z = 0; place it at BASE_DEPTH - TEXT_SINK. */
export function buildKeychainText(font: Font, safeText: string): THREE.BufferGeometry {
  const parts = layoutLines(font, safeText).map((line) =>
    new THREE.ExtrudeGeometry(line.shapes, {
      depth: TEXT_DEPTH,
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
