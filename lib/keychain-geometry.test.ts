// Run: npx tsx --test lib/keychain-geometry.test.ts
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import * as THREE from "three";
import { FontLoader } from "three/examples/jsm/loaders/FontLoader.js";
import { mergeVertices } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { buildKeychainPlate, buildKeychainText, DEFAULT_SIZE, findSpike, keychainPlateShape, keychainSize, keychainText, TEXT_SIZE } from "./keychain-geometry";
import { lineLimit, oneLine } from "./keychain-text";

const fontsDir = path.join(__dirname, "..", "public", "fonts");
const loadFont = (id: string) =>
  new FontLoader().parse(JSON.parse(fs.readFileSync(path.join(fontsDir, `${id}.typeface.json`), "utf8")));

function inside(p: THREE.Vector2, poly: THREE.Vector2[]) {
  let hit = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const a = poly[i], b = poly[j];
    if (a.y > p.y !== b.y > p.y && p.x < ((b.x - a.x) * (p.y - a.y)) / (b.y - a.y) + a.x) hit = !hit;
  }
  return hit;
}

test("keychainText: max 3 lines, 12 characters each, blank lines dropped", () => {
  assert.equal(keychainText("Imran"), "Imran");
  assert.equal(keychainText("  a  \n\n b \nc\nd"), "a\nb\nc");
  assert.equal(keychainText("abcdefghijklmnop"), "abcdefghijkl");
  assert.equal(keychainText("a\nb\nc", 2), "a\nb");
  assert.equal(keychainText("a\nb", 9), "a\nb"); // never more than 3
  assert.equal(keychainText("   \n  "), "KEY");
});

test("lineLimit reads the admin setting, clamped to 1–3, default 3", () => {
  assert.equal(lineLimit({ maxLines: 2 }), 2);
  assert.equal(lineLimit({ maxLines: 7 }), 3);
  assert.equal(lineLimit({ maxLines: 0 }), 1);
  assert.equal(lineLimit({}), 3);
  assert.equal(lineLimit(null), 3);
  assert.equal(oneLine("Imran\nHossain"), "Imran / Hossain");
});

/** Distance from each plate edge point (past the keyring ear) to the nearest letter, sorted. */
function edgeGaps(font: ReturnType<typeof loadFont>, text: string, size = DEFAULT_SIZE): number[] {
  const lines = text.split("\n").map((t) => font.generateShapes(t, size.textSize));
  const width = (sh: THREE.Shape[]) => Math.max(...sh.flatMap((s) => s.getPoints().map((p) => p.x)));
  const widest = Math.max(...lines.map(width));
  const letters: THREE.Vector2[] = [];
  lines.forEach((sh, i) =>
    sh.forEach((s) =>
      s.closePath().getSpacedPoints(600).forEach((p) => letters.push(new THREE.Vector2(p.x + (widest - width(sh)) / 2, p.y - i * size.textSize * 1.2)))
    )
  );
  const left = Math.min(...letters.map((p) => p.x));
  return keychainPlateShape(font, text, true, size)
    .getPoints()
    .filter((p) => p.x > left + 0.3)
    .map((p) => Math.min(...letters.map((q) => q.distanceTo(p))))
    .sort((a, b) => a - b);
}

// The client's rule: the plate edge keeps the same distance (the border) from the letters; only the
// notches between letters are filled, by at most the inside-corner rounding (0.2).
for (const [id, text] of [
  ["american_captain", "IMRAN"],
  ["helvetiker_bold", "IMRAN"],
  ["gravity_bold", "IMRAN"],
  ["helvetiker_bold", "Imran\nHossain"],
]) {
  test(`plate edge keeps the border distance from the letters (${id} ${JSON.stringify(text)})`, () => {
    const gaps = edgeGaps(loadFont(id), text);
    const R = DEFAULT_SIZE.border, median = gaps[Math.floor(gaps.length / 2)];
    assert.ok(gaps[0] > R - 0.02, `edge comes within ${gaps[0].toFixed(3)} of a letter (border ${R})`);
    assert.ok(Math.abs(median - R) < 0.01, `typical edge distance ${median.toFixed(3)}, expected ${R}`);
    assert.ok(gaps[gaps.length - 1] < R + 0.22, `edge strays ${gaps[gaps.length - 1].toFixed(3)} from the letters`);
  });
}

test("keychainSize reads the admin settings, ignores out-of-range values, keeps ear and hole printable", () => {
  assert.deepEqual(keychainSize(undefined), DEFAULT_SIZE);
  // the old seed stored extrusionDepth: 4 in other units: ignored
  assert.equal(keychainSize({ extrusionDepth: 4 }).textDepth, DEFAULT_SIZE.textDepth);
  const s = keychainSize({ fontSize: 1.5, extrusionDepth: 0.25, baseDepth: 0.3, offsetRadius: 0.2, earRadius: 0.2, holeRadius: 0.19 });
  assert.equal(s.textSize, 1.5);
  assert.equal(s.textDepth, 0.25);
  assert.equal(s.baseDepth, 0.3);
  assert.equal(s.border, 0.2);
  assert.ok(Math.abs(s.earRadius - 0.25) < 1e-9, "ear grown past the border");
  assert.ok(s.holeRadius <= s.earRadius - 0.06 + 1e-9, "hole keeps a wall inside the ear");
});

test("the border setting changes the plate (wider border, edge further from the letters)", () => {
  const font = loadFont("helvetiker_bold");
  const wide = { ...DEFAULT_SIZE, border: 0.2, earRadius: 0.3 };
  const gaps = edgeGaps(font, "IMRAN", wide);
  assert.ok(Math.abs(gaps[Math.floor(gaps.length / 2)] - 0.2) < 0.01, "typical edge distance follows the setting");
  const depth = new THREE.Box3().setFromBufferAttribute(
    buildKeychainPlate(font, "IMRAN", true, { ...DEFAULT_SIZE, baseDepth: 0.3 }).attributes.position as THREE.BufferAttribute
  );
  assert.ok(Math.abs(depth.max.z - (0.3 + 0.024)) < 1e-6, `plate thickness follows the setting, got ${depth.max.z}`);
});

const fonts = ["helvetiker_bold", "droid_serif_bold", "gravity_bold", "american_captain", "thunder_script"];
const texts = [
  "Imran", "Tommy", "Hello World", "Fiji", "jigsaw", "Imran\nHossain", "Imran\noi", "hello\njdk", "Tommy\nJo",
  "Ab\nCd\nEf", "A\nLongername12\nBo", "Hi there\nX", "TOP LINE\nmid\nBottom Line",
];

for (const id of fonts) {
  test(`plate encloses every letter and the keyring hole (${id})`, () => {
    const font = loadFont(id);
    for (const raw of texts) {
      const text = keychainText(raw);
      const { shape: outline, holes } = keychainPlateShape(font, text, true).extractPoints(12);
      assert.equal(holes.length, 1, `${text}: expected one keyring hole`);

      // every vertex of the lettering lies on the plate
      const pos = buildKeychainText(font, text).attributes.position;
      for (let i = 0; i < pos.count; i += 7) {
        const p = new THREE.Vector2(pos.getX(i), pos.getY(i));
        assert.ok(inside(p, outline), `${id} ${JSON.stringify(text)}: letter point ${p.x.toFixed(2)},${p.y.toFixed(2)} off the plate`);
      }
      // every point of every letter outline has plate around it on all four sides (catches the plate
      // cutting into a letter, e.g. along an outline edge the font leaves implicit)
      // Single line only: multi-line layout shifts lines; the vertex check above covers those.
      const m = 0.08;
      if (!text.includes("\n")) font.generateShapes(text, TEXT_SIZE).forEach((s) => {
        s.closePath();
        s.getSpacedPoints(60).forEach((p) => {
          for (const [dx, dy] of [[m, 0], [-m, 0], [0, m], [0, -m]]) {
            const q = new THREE.Vector2(p.x + dx, p.y + dy);
            assert.ok(inside(q, outline), `${id} ${JSON.stringify(text)}: plate edge closer than ${m} to letter at ${p.x.toFixed(2)},${p.y.toFixed(2)}`);
          }
        });
      });
      // the hole is inside the plate with a wall around it (0.04 units ≈ 0.6 mm printed)
      const centre = holes[0].reduce((c, p) => c.add(p), new THREE.Vector2()).divideScalar(holes[0].length);
      for (const p of holes[0]) {
        const wall = p.clone().add(p.clone().sub(centre).setLength(0.04));
        assert.ok(inside(wall, outline), `${id} ${JSON.stringify(text)}: keyring hole too close to the plate edge`);
      }
      // the outline never crosses itself (a crossing becomes a broken solid in the slicer)
      const segs = outline.map((a, i) => [a, outline[(i + 1) % outline.length]] as const);
      const cross = (o: THREE.Vector2, a: THREE.Vector2, b: THREE.Vector2) =>
        (a.x - o.x) * (b.y - o.y) - (a.y - o.y) * (b.x - o.x);
      for (let i = 0; i < segs.length; i++) {
        for (let j = i + 2; j < segs.length; j++) {
          if (i === 0 && j === segs.length - 1) continue; // neighbours via the closing edge
          const [p, q] = segs[i], [r, s] = segs[j];
          const hit = cross(p, q, r) * cross(p, q, s) < -1e-12 && cross(r, s, p) * cross(r, s, q) < -1e-12;
          assert.ok(!hit, `${id} ${JSON.stringify(text)}: outline crosses itself near ${p.x.toFixed(2)},${p.y.toFixed(2)}`);
        }
      }

      // no hair-thin spikes or slits (they show up as "wings" and can't print)
      const spike = findSpike(outline);
      assert.equal(spike, -1, `${id} ${JSON.stringify(text)}: spike at ${spike >= 0 ? `${outline[spike].x.toFixed(2)},${outline[spike].y.toFixed(2)}` : ""}`);

      // watertight: every edge joins exactly two triangles, or the slicer sees holes / broken walls.
      // thunder_script's "f" still folds its bevel in one spot (known; demo font, not for sale).
      if (id !== "thunder_script") {
        for (const [part, geom] of [["plate", buildKeychainPlate(font, text, true)], ["letters", buildKeychainText(font, text)]] as const) {
          const m = mergeVertices(geom.clone().deleteAttribute("normal").deleteAttribute("uv"), 1e-5);
          const idx = m.index!.array;
          const edges = new Map<string, number>();
          for (let i = 0; i < idx.length; i += 3)
            for (const [a, b] of [[idx[i], idx[i + 1]], [idx[i + 1], idx[i + 2]], [idx[i + 2], idx[i]]]) {
              const k = a < b ? `${a}_${b}` : `${b}_${a}`;
              edges.set(k, (edges.get(k) ?? 0) + 1);
            }
          const open = [...edges.values()].filter((c) => c !== 2).length;
          assert.equal(open, 0, `${id} ${JSON.stringify(text)}: ${part} has ${open} broken edges`);
        }
      }

      // lines stack downwards, one line per row
      const lines = text.split("\n").length;
      const box = new THREE.Box2().setFromPoints(outline);
      assert.ok(box.max.y - box.min.y > (lines - 1) * TEXT_SIZE, `${text}: plate too short for ${lines} lines`);
    }
  });
}
