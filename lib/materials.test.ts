// Run: npx tsx --test lib/materials.test.ts
import { test } from "node:test";
import assert from "node:assert/strict";
import { colorsFor, materialName, priceFor } from "./materials";

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

test("priceFor: TPU has its own price, or the PLA+ price when none is set", () => {
  const style = { basePrice: 100, config: { tpuPrice: 150 } };
  assert.equal(priceFor(style, "PLA"), 100);
  assert.equal(priceFor(style, "TPU"), 150);
  for (const config of [{}, null, { tpuPrice: null }, { tpuPrice: "5" }, { tpuPrice: -1 }])
    assert.equal(priceFor({ basePrice: 100, config }, "TPU"), 100);
});

test("materialName is empty for old orders", () => {
  assert.equal(materialName("TPU"), "Flexible (TPU)");
  assert.equal(materialName(null), "");
});
