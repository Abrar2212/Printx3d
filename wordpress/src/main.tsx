// WordPress entry: mounts the 3D studio into every [printx3d] shortcode.
// Data comes from the plugin settings page via window.PRINTX3D (see printx3d.php).
import { useState } from "react";
import { createRoot } from "react-dom/client";
import StudioCanvas from "@/components/3d/StudioCanvas";
import TextInput from "@/components/customizer/TextInput";
import StyleSelector from "@/components/customizer/StyleSelector";
import FontStyleSelector from "@/components/customizer/FontStyleSelector";
import MaterialSelector from "@/components/customizer/MaterialSelector";
import ColorPicker from "@/components/customizer/ColorPicker";
import ColorDuoPicker from "@/components/customizer/ColorDuoPicker";
import { keychainSize } from "@/lib/keychain-geometry";
import { colorsFor } from "@/lib/materials";
import { lineLimit } from "@/lib/keychain-text";
import { FONT_STYLE_OPTIONS, type Style, type FilamentColor } from "@/types";

interface Cart {
  ajaxUrl: string;
  nonce: string;
}

const { styles = [], colors = [], materials = [], currency = "$", defaultText = "Your Name", cart = null } = (window as unknown as {
  PRINTX3D: { styles: Style[]; colors: FilamentColor[]; materials: { id: string; name: string }[]; currency?: string; defaultText?: string; cart?: Cart | null };
}).PRINTX3D;
// Personal-use fonts are not shipped with the plugin (see copy-fonts.mjs)
const fonts = FONT_STYLE_OPTIONS.filter((f) => !f.personalUseOnly);

function Studio() {
  const [text, setText] = useState(defaultText);
  const [styleId, setStyleId] = useState(styles[0]?.id ?? "");
  const [material, setMaterial] = useState(materials[0]?.id ?? "");
  const [baseId, setBaseId] = useState("");
  const [textId, setTextId] = useState("");
  const [font, setFont] = useState(fonts[0].id);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const style = styles.find((s) => s.id === styleId);
  const { available, text: textColor, base: baseColor } = colorsFor(colors, material, textId, baseId);

  const selectStyle = (id: string) => {
    setStyleId(id);
    const limit = lineLimit(styles.find((s) => s.id === id)?.config);
    setText((t) => t.split("\n").slice(0, limit).join("\n"));
  };

  // The server re-checks everything and sets the price itself; this only sends the choices.
  const addToCart = async () => {
    if (!cart) return;
    setBusy(true);
    setError("");
    try {
      const body = new FormData();
      body.append("action", "printx3d_add_to_cart");
      body.append("nonce", cart.nonce);
      body.append("text", text);
      body.append("font", font);
      body.append("style", styleId);
      body.append("material", material);
      body.append("textColor", textColor?.id ?? "");
      body.append("baseColor", baseColor?.id ?? "");
      const res = await fetch(cart.ajaxUrl, { method: "POST", body, credentials: "same-origin" });
      const json = (await res.json().catch(() => null)) as { success: boolean; data?: { cartUrl?: string; message?: string } } | null;
      if (json?.success && json.data?.cartUrl) window.location.href = json.data.cartUrl;
      else setError(json?.data?.message ?? "Could not add to cart. Please reload the page and try again.");
    } catch {
      setError("Could not reach the shop. Check your connection and try again.");
    }
    setBusy(false);
  };

  return (
    <div className="bg-surface text-primary-navy border border-border rounded-3xl @3xl:overflow-hidden flex flex-col @3xl:flex-row @3xl:h-[600px]">
      <div className="@3xl:flex-1 bg-linear-to-b from-brand-tint to-cream h-[320px] sm:h-[380px] @3xl:h-full overflow-hidden rounded-t-3xl @3xl:rounded-none border-b @3xl:border-b-0 @3xl:border-r border-border">
        <StudioCanvas
          text={text || "Key"}
          textColor={textColor?.hexCode ?? "#FF6600"}
          baseColor={baseColor?.hexCode ?? "#111111"}
          fontStyle={font}
          hasKeychainLoop={style?.config?.hasKeychainLoop ?? true}
          size={keychainSize(style?.config)}
        />
      </div>
      <aside className="w-full @3xl:w-[420px] flex flex-col">
        <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-6">
        <TextInput value={text} onChange={setText} maxLines={lineLimit(style?.config)} />
        <FontStyleSelector selectedId={font} onSelect={setFont} options={fonts} />
        <MaterialSelector materials={materials} selectedId={material} onSelect={setMaterial} />
        <ColorDuoPicker
          colors={available}
          selectedBaseColorId={baseColor?.id ?? null}
          selectedTextColorId={textColor?.id ?? null}
          onApplyDuo={(b, t) => {
            setBaseId(b);
            setTextId(t);
          }}
        />
        <ColorPicker label="Letter colour" colors={available} selectedId={textColor?.id ?? null} onSelect={setTextId} />
        <ColorPicker label="Base colour" colors={available} selectedId={baseColor?.id ?? null} onSelect={setBaseId} />
        <StyleSelector styles={styles} selectedId={styleId} onSelect={selectStyle} currency={currency} />
        </div>
        {cart && (
          <div className="p-5 sm:px-6 border-t border-border">
            <div className="flex items-center justify-between gap-4">
              <div className="font-display text-2xl font-extrabold leading-tight">
                {currency}
                {(style?.basePrice ?? 0).toFixed(2)}
              </div>
              <button
                type="button"
                onClick={addToCart}
                disabled={busy || !text.trim() || !style || !textColor || !baseColor}
                className="h-12 px-6 bg-brand hover:bg-brand-hover disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-full font-bold whitespace-nowrap transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-brand/30"
              >
                {busy ? "Adding…" : "Add to cart"}
              </button>
            </div>
            {error && (
              <p role="alert" className="mt-2 text-sm text-error-ink">
                {error}
              </p>
            )}
          </div>
        )}
      </aside>
    </div>
  );
}

// @container: layout follows the shortcode box width, since WordPress themes often use a narrow content column
document.querySelectorAll(".printx3d-customizer").forEach((el) => {
  el.classList.add("@container");
  createRoot(el).render(<Studio />);
});
