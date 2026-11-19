"use client";

import { useState, useRef } from "react";
import dynamic from "next/dynamic";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faArrowRight } from "@fortawesome/free-solid-svg-icons";
import HeroSection from "@/components/HeroSection";
import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";
import TextInput from "./TextInput";
import StyleSelector from "./StyleSelector";
import FontStyleSelector from "./FontStyleSelector";
import ColorPicker from "./ColorPicker";
import ColorDuoPicker from "./ColorDuoPicker";
import OrderModal from "./OrderModal";
import type { Style, FilamentColor, StyleConfig } from "@/types";
import { lineLimit } from "@/lib/keychain-text";

// Load 3D canvas only on client (no SSR)
const StudioCanvas = dynamic(() => import("@/components/3d/StudioCanvas"), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full flex flex-col items-center justify-center text-secondary-slate text-sm gap-3 min-h-[220px] bg-surface-muted">
      <div className="w-6 h-6 border-2 border-primary-navy border-t-transparent rounded-full animate-spin" />
      <span>Loading 3D preview…</span>
    </div>
  ),
});

// Suppress false-positive hydration warnings caused by browser extensions mutating the DOM (e.g. Bitwarden bis_skin_checked)
if (typeof window !== "undefined") {
  const origError = console.error;
  console.error = (...args: unknown[]) => {
    const fullText = args
      .map((a) => {
        if (typeof a === "string") return a;
        try {
          return JSON.stringify(a) ?? "";
        } catch {
          return String(a);
        }
      })
      .join(" ");

    if (
      fullText.includes("bis_skin_checked") ||
      fullText.includes("hydration-mismatch") ||
      fullText.includes("A tree hydrated but some attributes") ||
      fullText.includes("did not match. Server:") ||
      fullText.includes("Text content did not match")
    ) {
      return;
    }
    origError(...args);
  };
}

interface Props {
  styles: (Style & { config: StyleConfig })[];
  colors: FilamentColor[];
}

export default function CustomizerStudio({ styles, colors }: Props) {
  const studioRef = useRef<HTMLDivElement>(null);

  // Default text and selections
  const [text, setText] = useState("Imran");
  const [selectedStyleId, setSelectedStyleId] = useState<string>(styles[0]?.id ?? "");

  // Text Color (Foreground) & Base Color (Key Background Plate)
  const defaultBaseColor = colors.find((c) => c.hexCode === "#111111") || colors[0];
  const defaultTextColor =
    colors.find((c) => c.hexCode === "#FF6600" || c.hexCode === "#FFD000") || colors[1] || colors[0];

  const [selectedTextColorId, setSelectedTextColorId] = useState<string>(
    defaultTextColor?.id ?? colors[0]?.id ?? ""
  );
  const [selectedBaseColorId, setSelectedBaseColorId] = useState<string>(
    defaultBaseColor?.id ?? colors[0]?.id ?? ""
  );
  const [selectedFontStyle, setSelectedFontStyle] = useState<string>("helvetiker_bold");
  const [isOrderModalOpen, setIsOrderModalOpen] = useState(false);

  const selectedStyle = styles.find((s) => s.id === selectedStyleId) ?? null;
  const selectedTextColor = colors.find((c) => c.id === selectedTextColorId) ?? null;
  const selectedBaseColor = colors.find((c) => c.id === selectedBaseColorId) ?? null;
  const price = selectedStyle?.basePrice ?? 5.99;
  const maxLines = lineLimit(selectedStyle?.config);

  const selectStyle = (id: string) => {
    setSelectedStyleId(id);
    // drop extra lines if the new product allows fewer
    const limit = lineLimit(styles.find((s) => s.id === id)?.config);
    setText((t) => t.split("\n").slice(0, limit).join("\n"));
  };

  const scrollToStudio = () => {
    studioRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <div className="min-h-screen bg-bg text-primary-navy flex flex-col" suppressHydrationWarning>
      <SiteHeader />

      <main className="flex-1">
        <HeroSection onScrollToStudio={scrollToStudio} />

        {/* ── 3D Studio ── */}
        <section id="studio" ref={studioRef} className="scroll-mt-16 py-12 md:py-16">
          <div className="max-w-6xl mx-auto px-4 sm:px-6">
            <h2 className="text-2xl md:text-3xl font-extrabold tracking-tight mb-6">Design your keychain</h2>

            <div className="bg-surface border border-border rounded-2xl overflow-hidden flex flex-col lg:flex-row lg:h-[560px]">
              {/* Preview stays in view on phones while scrolling the options */}
              <div className="flex-1 bg-surface-muted h-[240px] sm:h-[320px] lg:h-full sticky top-16 lg:static z-20 border-b lg:border-b-0 lg:border-r border-border">
                <StudioCanvas
                  text={text || "Key"}
                  textColor={selectedTextColor?.hexCode ?? "#FF6600"}
                  baseColor={selectedBaseColor?.hexCode ?? "#111111"}
                  fontStyle={selectedFontStyle}
                  materialType={selectedTextColor?.materialType ?? "PLA"}
                  extrusionDepth={selectedStyle?.config?.extrusionDepth ?? 5}
                  bevel={selectedStyle?.config?.bevel ?? 0.5}
                  hasKeychainLoop={selectedStyle?.config?.hasKeychainLoop ?? true}
                />
              </div>

              <aside className="w-full lg:w-[420px] flex flex-col">
                <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-6">
                  <TextInput value={text} onChange={setText} maxLines={maxLines} />
                  <FontStyleSelector selectedId={selectedFontStyle} onSelect={setSelectedFontStyle} />
                  <ColorDuoPicker
                    colors={colors}
                    selectedBaseColorId={selectedBaseColorId}
                    selectedTextColorId={selectedTextColorId}
                    onApplyDuo={(baseId, textId) => {
                      setSelectedBaseColorId(baseId);
                      setSelectedTextColorId(textId);
                    }}
                  />
                  <ColorPicker
                    label="Letter colour"
                    colors={colors}
                    selectedId={selectedTextColorId}
                    onSelect={setSelectedTextColorId}
                  />
                  <ColorPicker
                    label="Base colour"
                    colors={colors}
                    selectedId={selectedBaseColorId}
                    onSelect={setSelectedBaseColorId}
                  />
                  <StyleSelector styles={styles} selectedId={selectedStyleId} onSelect={selectStyle} />
                </div>

                <div className="p-5 sm:px-6 border-t border-border bg-surface flex items-center justify-between gap-4 sticky bottom-0 lg:static">
                  <div>
                    <div className="text-xl font-extrabold leading-tight">৳{price.toFixed(2)}</div>
                    <div className="text-xs text-secondary-slate">Keyring included</div>
                  </div>
                  <button
                    onClick={() => setIsOrderModalOpen(true)}
                    disabled={!text.trim() || !selectedStyleId || !selectedTextColorId}
                    className="h-12 px-6 bg-primary-navy hover:bg-primary-navy-hover disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-xl font-semibold text-sm transition-colors flex items-center gap-2 cursor-pointer focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary-navy/25"
                  >
                    Order now
                    <FontAwesomeIcon icon={faArrowRight} className="text-xs" />
                  </button>
                </div>
              </aside>
            </div>
          </div>
        </section>
      </main>

      <SiteFooter />

      <OrderModal
        isOpen={isOrderModalOpen}
        onClose={() => setIsOrderModalOpen(false)}
        customText={text}
        selectedStyle={selectedStyle}
        selectedTextColor={selectedTextColor}
        selectedBaseColor={selectedBaseColor}
        selectedFontStyle={selectedFontStyle}
      />
    </div>
  );
}
