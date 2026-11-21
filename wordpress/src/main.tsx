// WordPress entry: mounts the 3D studio into every [printx3d] shortcode.
// Data comes from the plugin settings page via window.PRINTX3D (see printx3d.php).
import { useState } from "react";
import { createRoot } from "react-dom/client";
import StudioCanvas from "@/components/3d/StudioCanvas";
import TextInput from "@/components/customizer/TextInput";
import StyleSelector from "@/components/customizer/StyleSelector";
import FontStyleSelector from "@/components/customizer/FontStyleSelector";
import ColorPicker from "@/components/customizer/ColorPicker";
import ColorDuoPicker from "@/components/customizer/ColorDuoPicker";
import { lineLimit } from "@/lib/keychain-text";
import type { Style, FilamentColor } from "@/types";

const { styles = [], colors = [] } = (window as unknown as {
  PRINTX3D: { styles: Style[]; colors: FilamentColor[] };
}).PRINTX3D;

function Studio() {
  const [text, setText] = useState("Imran");
  const [styleId, setStyleId] = useState(styles[0]?.id ?? "");
  const [baseId, setBaseId] = useState((colors.find((c) => c.hexCode === "#111111") ?? colors[0])?.id ?? "");
  const [textId, setTextId] = useState(
    (colors.find((c) => c.hexCode === "#FF6600" || c.hexCode === "#FFD000") ?? colors[1] ?? colors[0])?.id ?? ""
  );
  const [font, setFont] = useState("helvetiker_bold");

  const style = styles.find((s) => s.id === styleId);
  const textColor = colors.find((c) => c.id === textId);
  const baseColor = colors.find((c) => c.id === baseId);

  const selectStyle = (id: string) => {
    setStyleId(id);
    const limit = lineLimit(styles.find((s) => s.id === id)?.config);
    setText((t) => t.split("\n").slice(0, limit).join("\n"));
  };

  return (
    <div className="bg-surface text-primary-navy border border-border rounded-3xl @3xl:overflow-hidden flex flex-col @3xl:flex-row @3xl:h-[600px]">
      <div className="@3xl:flex-1 bg-linear-to-b from-brand-tint to-cream h-[320px] sm:h-[380px] @3xl:h-full overflow-hidden rounded-t-3xl @3xl:rounded-none border-b @3xl:border-b-0 @3xl:border-r border-border">
        <StudioCanvas
          text={text || "Key"}
          textColor={textColor?.hexCode ?? "#FF6600"}
          baseColor={baseColor?.hexCode ?? "#111111"}
          fontStyle={font}
          materialType={textColor?.materialType ?? "PLA"}
          extrusionDepth={style?.config?.extrusionDepth ?? 5}
          bevel={style?.config?.bevel ?? 0.5}
          hasKeychainLoop={style?.config?.hasKeychainLoop ?? true}
        />
      </div>
      <aside className="w-full @3xl:w-[420px] overflow-y-auto p-5 sm:p-6 space-y-6">
        <TextInput value={text} onChange={setText} maxLines={lineLimit(style?.config)} />
        <FontStyleSelector selectedId={font} onSelect={setFont} />
        <ColorDuoPicker
          colors={colors}
          selectedBaseColorId={baseId}
          selectedTextColorId={textId}
          onApplyDuo={(b, t) => {
            setBaseId(b);
            setTextId(t);
          }}
        />
        <ColorPicker label="Letter colour" colors={colors} selectedId={textId} onSelect={setTextId} />
        <ColorPicker label="Base colour" colors={colors} selectedId={baseId} onSelect={setBaseId} />
        <StyleSelector styles={styles} selectedId={styleId} onSelect={selectStyle} />
      </aside>
    </div>
  );
}

// @container: layout follows the shortcode box width, since WordPress themes often use a narrow content column
document.querySelectorAll(".printx3d-customizer").forEach((el) => {
  el.classList.add("@container");
  createRoot(el).render(<Studio />);
});
