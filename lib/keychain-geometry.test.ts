// Run: npx tsx --test lib/keychain-geometry.test.ts
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import * as THREE from "three";
import { FontLoader } from "three/examples/jsm/loaders/FontLoader.js";
import { buildKeychainText, filletInsideCorners, findSpike, keychainPlateShape, keychainText, TEXT_SIZE } from "./keychain-geometry";
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

test("filletInsideCorners rounds a step with the given radius and never removes plate", () => {
  const step = 0.01, r = 0.3;
  const f = [...Array(100).fill(0), ...Array(100).fill(-1.5)]; // wide line, then a narrower one below
  const g = filletInsideCorners(f, step, r);
  g.forEach((v, i) => assert.ok(v <= f[i] + 1e-9, `removed plate at ${i}`));
  assert.ok(Math.abs(g[20] - 0) < 1e-9, "far from the step: unchanged");
  assert.ok(Math.abs(g[180] + 1.5) < 1e-9, "below the step: unchanged");
  assert.ok(Math.abs(g[99] + r) < 0.02, `corner filled down to about -r, got ${g[99]}`);
  const at45 = 100 - Math.round((r - r / Math.SQRT2) / step);
  assert.ok(Math.abs(g[at45] + (r - r / Math.SQRT2)) < 0.02, "follows a circular arc");
});

const fonts = ["helvetiker_bold", "droid_serif_bold", "gravity_bold", "american_captain", "thunder_script"];
const texts = [
  "Imran", "Tommy", "Hello World", "Imran\nHossain", "Imran\noi", "hello\njdk", "Tommy\nJo",
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

      // lines stack downwards, one line per row
      const lines = text.split("\n").length;
      const box = new THREE.Box2().setFromPoints(outline);
      assert.ok(box.max.y - box.min.y > (lines - 1) * TEXT_SIZE, `${text}: plate too short for ${lines} lines`);
    }
  });
}
