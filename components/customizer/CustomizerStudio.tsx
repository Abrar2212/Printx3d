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
import { keychainSize } from "@/lib/keychain-geometry";

// Load 3D canvas only on client (no SSR)
const StudioCanvas = dynamic(() => import("@/components/3d/StudioCanvas"), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full flex flex-col items-center justify-center text-secondary-slate text-sm gap-3 min-h-[220px]">
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
    <div className="min-h-screen bg-cream text-primary-navy flex flex-col" suppressHydrationWarning>
      <SiteHeader />

      <main className="flex-1">
        <HeroSection onScrollToStudio={scrollToStudio} />

        {/* ── 3D Studio ── */}
        <section id="studio" ref={studioRef} className="scroll-mt-16 py-14 md:py-20">
          <div className="max-w-6xl mx-auto px-4 sm:px-6">
            <h2 className="text-3xl md:text-4xl font-extrabold tracking-tight">Design your keychain</h2>
            <p className="text-primary-navy/70 mt-2 mb-7">What you see here is exactly what we print.</p>

            {/* overflow-hidden only on desktop: on phones it would trap the sticky preview and order bar inside the card */}
            <div className="bg-surface border border-border rounded-3xl lg:overflow-hidden shadow-xl shadow-primary-navy/5 flex flex-col lg:flex-row lg:h-[600px]">
              {/* Preview stays in view on phones while scrolling the options */}
              <div className="flex-1 bg-linear-to-b from-brand-tint to-cream h-[320px] sm:h-[380px] lg:h-full sticky top-16 lg:static z-20 overflow-hidden rounded-t-3xl lg:rounded-none border-b lg:border-b-0 lg:border-r border-border">
                <StudioCanvas
                  text={text || "Key"}
                  textColor={selectedTextColor?.hexCode ?? "#FF6600"}
                  baseColor={selectedBaseColor?.hexCode ?? "#111111"}
                  fontStyle={selectedFontStyle}
                  materialType={selectedTextColor?.materialType ?? "PLA"}
                  size={keychainSize(selectedStyle?.config)}
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

                <div className="p-5 sm:px-6 border-t border-border bg-surface flex items-center justify-between gap-4 sticky bottom-0 lg:static z-20 rounded-b-3xl lg:rounded-none">
                  <div>
                    <div className="font-display text-2xl font-extrabold leading-tight">৳{price.toFixed(2)}</div>
                    <div className="text-xs font-semibold text-secondary-slate">
                      Keyring included<span className="hidden sm:inline"> · Pay on delivery</span>
                    </div>
                  </div>
                  <button
                    onClick={() => setIsOrderModalOpen(true)}
                    disabled={!text.trim() || !selectedStyleId || !selectedTextColorId}
                    className="h-12 px-6 bg-brand hover:bg-brand-hover disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-full font-bold text-base whitespace-nowrap shrink-0 transition-colors flex items-center gap-2 cursor-pointer focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-brand/30"
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
