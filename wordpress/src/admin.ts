// wp-admin only (order screens, staff who can edit orders): builds the STL for a "Download STL"
// button from the design saved on the order. The file is made here in the browser, so there is
// no download URL anyone could share or guess.
import { FontLoader } from "three/examples/jsm/loaders/FontLoader.js";
import { keychainSTL } from "@/lib/keychain-stl";

interface Design {
  text: string;
  font: string;
  hasKeychainLoop: boolean;
}

const { fontBase } = (window as unknown as { PRINTX3D_ADMIN: { fontBase: string } }).PRINTX3D_ADMIN;

document.addEventListener("click", async (e) => {
  const button = (e.target as HTMLElement).closest<HTMLButtonElement>(".printx3d-stl");
  if (!button) return;
  e.preventDefault();
  const label = button.textContent;
  button.disabled = true;
  button.textContent = "Building STL…";
  try {
    const design = JSON.parse(button.dataset.design ?? "{}") as Design;
    const font = await new FontLoader().loadAsync(`${fontBase}${design.font}.typeface.json`);
    const stl = keychainSTL(font, design.text, design.hasKeychainLoop);
    const url = URL.createObjectURL(new Blob([stl.buffer as ArrayBuffer], { type: "model/stl" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = button.dataset.filename || "keychain.stl";
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 10_000);
    button.textContent = label;
  } catch (err) {
    console.error("[PrintX3D] STL failed", err);
    button.textContent = "STL failed – reload and retry";
  } finally {
    button.disabled = false;
  }
});
