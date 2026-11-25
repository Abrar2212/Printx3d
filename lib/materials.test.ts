// Run: npx tsx --test lib/materials.test.ts
import { test } from "node:test";
import assert from "node:assert/strict";
import { colorsFor, materialName } from "./materials";

const black = { id: "black", hexCode: "#111111", materials: ["PLA", "TPU"] };
const orange = { id: "orange", hexCode: "#FF6600", materials: ["TPU"] };
const pink = { id: "pink", hexCode: "#FF2E93", materials: ["PLA"] };
const all = [black, orange, pink];

test("only colours stocked in the material are offered, and unavailable picks fall back", () => {
  const tpu = colorsFor(all, "TPU", "pink", "black");
  assert.deepEqual(tpu.available, [black, orange]);
  assert.equal(tpu.text, orange); // pink isn't made in TPU
  assert.equal(tpu.base, black);
  assert.equal(colorsFor(all, "PLA", "pink", "black").text, pink); // returns on switching back
  assert.equal(colorsFor([], "PLA", "", "").text, undefined);
});

test("materialName is empty for old orders", () => {
  assert.equal(materialName("TPU"), "Flexible (TPU)");
  assert.equal(materialName(null), "");
});
