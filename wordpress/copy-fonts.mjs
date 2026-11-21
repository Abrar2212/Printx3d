// Copies the fonts the plugin may ship into wordpress/printx3d/fonts.
// Fonts marked `personalUseOnly: true` in types/index.ts are left out: their licence forbids
// handing them to buyers.
import fs from "node:fs";

const types = fs.readFileSync("types/index.ts", "utf8");
const blocked = [...types.matchAll(/id: "([a-z0-9_]+)",\s*\n\s*personalUseOnly: true/g)].map((m) => m[1]);
// self-check: if the pattern stops matching (types/index.ts reformatted), fail instead of shipping them
if (!blocked.includes("american_captain") || !blocked.includes("thunder_script")) {
  console.error("copy-fonts: could not read the personal-use font list from types/index.ts");
  process.exit(1);
}

// The font picker's list (id → display name), minus the blocked ones
const names = Object.fromEntries([...types.matchAll(/id: "([a-z0-9_]+)",[^}]*?name: "([^"]+)"/g)].map((m) => [m[1], m[2]]));
const offered = Object.keys(names).filter((id) => !blocked.includes(id));
if (offered.length < 3 || !names.helvetiker_bold) {
  console.error("copy-fonts: could not read the font list from types/index.ts");
  process.exit(1);
}

const out = "wordpress/printx3d/fonts";
fs.rmSync(out, { recursive: true, force: true }); // drop fonts left over from older builds
fs.mkdirSync(out, { recursive: true });
for (const id of offered) fs.copyFileSync(`public/fonts/${id}.typeface.json`, `${out}/${id}.typeface.json`);
// printx3d.php reads this: the fonts an order may use, and their names for the order screen
fs.writeFileSync(`${out}/fonts.json`, JSON.stringify(Object.fromEntries(offered.map((id) => [id, names[id]])), null, 1));
console.log(`copy-fonts: shipped ${offered.length} fonts, left out ${blocked.join(", ")}`);
