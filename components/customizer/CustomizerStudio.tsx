"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faArrowRight } from "@fortawesome/free-solid-svg-icons";
import HeroSection from "@/components/HeroSection";
import TextInput from "./TextInput";
import StyleSelector from "./StyleSelector";
import FontStyleSelector from "./FontStyleSelector";
import ColorPicker from "./ColorPicker";
import ColorDuoPicker from "./ColorDuoPicker";
import PriceSummary from "./PriceSummary";
import OrderModal from "./OrderModal";
import type { Style, FilamentColor, StyleConfig } from "@/types";

// Load 3D canvas only on client (no SSR)
const StudioCanvas = dynamic(() => import("@/components/3d/StudioCanvas"), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full flex flex-col items-center justify-center text-[#64748B] text-xs gap-2 min-h-[220px] bg-[#F1F5F9]">
      <div className="w-5 h-5 border-2 border-[#0F172A] border-t-transparent rounded-full animate-spin" />
      <span>Calibrating Two-Tone 3D Key Model…</span>
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
  const router = useRouter();
  const studioRef = useRef<HTMLDivElement>(null);

  // Default text and selections
  const [text, setText] = useState("Imran");
  const [selectedStyleId, setSelectedStyleId] = useState<string>(
    styles[0]?.id ?? ""
  );

  // Text Color (Foreground) & Base Color (Key Background Plate)
  const defaultBaseColor =
    colors.find((c) => c.hexCode === "#111111") || colors[0];
  const defaultTextColor =
    colors.find((c) => c.hexCode === "#FF6600" || c.hexCode === "#FFD000") ||
    colors[1] ||
    colors[0];

  const [selectedTextColorId, setSelectedTextColorId] = useState<string>(
    defaultTextColor?.id ?? colors[0]?.id ?? ""
  );
  const [selectedBaseColorId, setSelectedBaseColorId] = useState<string>(
    defaultBaseColor?.id ?? colors[0]?.id ?? ""
  );

  // Selected Font Style
  const [selectedFontStyle, setSelectedFontStyle] = useState<string>("helvetiker_bold");

  // Direct Fast Order Modal
  const [isOrderModalOpen, setIsOrderModalOpen] = useState(false);

  const selectedStyle = styles.find((s) => s.id === selectedStyleId) ?? null;
  const selectedTextColor = colors.find((c) => c.id === selectedTextColorId) ?? null;
  const selectedBaseColor = colors.find((c) => c.id === selectedBaseColorId) ?? null;

  const scrollToStudio = () => {
    studioRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const handleApplyDuo = (baseId: string, textId: string) => {
    setSelectedBaseColorId(baseId);
    setSelectedTextColorId(textId);
  };

  const handleOrderNow = () => {
    setIsOrderModalOpen(true);
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-[#0F172A] flex flex-col" suppressHydrationWarning>
      {/* ── Top Navigation Bar ── */}
      <header className="bg-white border-b border-[#E2E8F0] px-4 sm:px-6 py-3.5 flex items-center justify-between shadow-xs relative sm:sticky sm:top-0 z-30" suppressHydrationWarning>
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-[#0F172A] flex items-center justify-center text-white font-bold text-base shadow-xs">
            P
          </div>
          <div>
            <h1 className="text-lg font-bold tracking-tight text-[#0F172A] leading-tight">
              Print<span className="text-[#059669]">X3D</span>
            </h1>
            <p className="text-[11px] text-[#64748B] font-medium uppercase tracking-wider">
              Two-Tone 3D Name Keychains & Fabrication
            </p>
          </div>
        </div>

        <nav className="hidden md:flex items-center gap-6 text-xs font-semibold text-[#64748B]">
          <button
            type="button"
            onClick={scrollToStudio}
            className="hover:text-[#0F172A] transition-colors"
          >
            3D Studio
          </button>
          <a href="#how-it-works" className="hover:text-[#0F172A] transition-colors">
            How It Works
          </a>
          <a href="#materials" className="hover:text-[#0F172A] transition-colors">
            Filament Palette
          </a>
          <a
            href="/track/example"
            className="hover:text-[#0F172A] transition-colors"
          >
            Track Order
          </a>
        </nav>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={scrollToStudio}
            className="px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-[#0F172A] text-white hover:bg-[#020617] transition-all shadow-xs inline-flex items-center gap-1.5 cursor-pointer"
          >
            <span>Create Keychain</span>
            <FontAwesomeIcon icon={faArrowRight} className="text-[10px]" />
          </button>
        </div>
      </header>

      {/* ── Hero Section ── */}
      <HeroSection
        onScrollToStudio={scrollToStudio}
        onQuickTextSelect={(quickText) => {
          setText(quickText);
          scrollToStudio();
        }}
      />

      {/* ── Calm 3-Step Process ── */}
      <section id="how-it-works" className="py-16 bg-white border-b border-[#E2E8F0]">
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center max-w-xl mx-auto mb-12 space-y-2">
            <span className="text-xs font-bold text-[#059669] uppercase tracking-wider bg-[#059669]/10 px-2.5 py-1 rounded">
              Contour Backplate Technology
            </span>
            <h2 className="text-2xl md:text-3xl font-extrabold text-[#0F172A] tracking-tight">
              Custom Two-Tone Keys With Solid Backing
            </h2>
            <p className="text-sm text-[#64748B]">
              Dual-layer 3D printing with a thick contour background plate and embossed lettering on top.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl p-6 space-y-3 shadow-xs">
              <div className="w-10 h-10 rounded-lg bg-[#0F172A] text-white flex items-center justify-center font-mono font-bold text-sm">
                01
              </div>
              <h3 className="text-base font-bold text-[#0F172A]">
                1. Contour Backplate Base
              </h3>
              <p className="text-xs text-[#64748B] leading-relaxed">
                A solid, smooth-bevel 3.2mm background plate tracing your name's outline with an integrated circular eyelet loop for your keyring.
              </p>
            </div>

            <div className="bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl p-6 space-y-3 shadow-xs">
              <div className="w-10 h-10 rounded-lg bg-[#059669] text-white flex items-center justify-center font-mono font-bold text-sm">
                02
              </div>
              <h3 className="text-base font-bold text-[#0F172A]">
                2. Embossed Contrast Lettering
              </h3>
              <p className="text-xs text-[#64748B] leading-relaxed">
                Your custom text is extruded cleanly in a contrasting polymer on top of the plate using high-resolution 0.12mm layer slicing.
              </p>
            </div>

            <div className="bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl p-6 space-y-3 shadow-xs">
              <div className="w-10 h-10 rounded-lg bg-[#0F172A] text-white flex items-center justify-center font-mono font-bold text-sm">
                03
              </div>
              <h3 className="text-base font-bold text-[#0F172A]">
                3. Heavy-Duty Hardware Attached
              </h3>
              <p className="text-xs text-[#64748B] leading-relaxed">
                Fitted with a stainless-steel split keyring and swivel jump chain, packed in protective casing, and dispatched to your door.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ── 3D Customizer Studio Workspace ── */}
      <section
        id="customizer-studio"
        ref={studioRef}
        className="scroll-mt-14 py-10 bg-[#F8FAFC]"
      >
        <div className="max-w-7xl mx-auto px-6 mb-6">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
            <div>
              <span className="text-xs font-bold text-[#059669] uppercase tracking-wider bg-[#059669]/10 px-2 py-0.5 rounded">
                Live 3D Customizer
              </span>
              <h2 className="text-2xl md:text-3xl font-extrabold text-[#0F172A] tracking-tight mt-1">
                Design Your Two-Tone 3D Key
              </h2>
              <p className="text-xs sm:text-sm text-[#64748B] mt-0.5">
                Inspect the embossed lettering, background plate, and keychain ring in real time.
              </p>
            </div>

            <div className="flex items-center gap-2 text-xs text-[#64748B] bg-white border border-[#E2E8F0] px-3 py-1.5 rounded-lg shadow-2xs">
              <span className="inline-block w-2 h-2 rounded-full bg-[#059669] animate-pulse" />
              <span>Two-Tone Real-Time Slicing Simulation</span>
            </div>
          </div>
        </div>

        {/* ── Studio Frame (Canvas + Controls) ── */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="bg-white border border-[#E2E8F0] rounded-2xl shadow-md flex flex-col lg:flex-row h-auto lg:h-[530px] overflow-visible lg:overflow-hidden">
            {/* ── Visualizer (3D Interactive Model Locked on Mobile) ── */}
            <div className="flex-1 bg-[#F1F5F9] h-[230px] sm:h-[300px] lg:h-full sticky top-0 sm:top-[56px] lg:static z-20 border-b lg:border-b-0 lg:border-r border-[#E2E8F0] overflow-hidden rounded-t-2xl lg:rounded-none shadow-sm lg:shadow-none">
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

            {/* ── Customization Controls Panel ── */}
            <aside className="w-full lg:w-[460px] h-auto lg:h-full flex flex-col bg-white overflow-hidden rounded-b-2xl lg:rounded-none">
              {/* Header */}
              <div className="px-5 py-3 border-b border-[#E2E8F0] bg-white flex items-center justify-between shrink-0">
                <div>
                  <h3 className="text-sm font-bold text-[#0F172A]">
                    Key Configuration
                  </h3>
                  <p className="text-[11px] text-[#64748B]">
                    Type your name &amp; select custom styling
                  </p>
                </div>
                <div className="flex items-center gap-1.5 text-[10px] font-mono text-[#059669] bg-[#059669]/10 px-2 py-0.5 rounded font-semibold">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#059669] animate-pulse" />
                  <span>Real-Time Sync</span>
                </div>
              </div>

              {/* Scrollable controls body */}
              <div className="flex-1 overflow-y-auto px-5 py-3.5 space-y-4">
                {/* 1. Name & Typographic Style (Directly Connected) */}
                <div className="space-y-2">
                  <TextInput value={text} onChange={setText} />
                  <FontStyleSelector
                    selectedId={selectedFontStyle}
                    onSelect={setSelectedFontStyle}
                  />
                </div>

                {/* 2. Real Two-Tone Color Duo Pairings */}
                <ColorDuoPicker
                  colors={colors}
                  selectedBaseColorId={selectedBaseColorId}
                  selectedTextColorId={selectedTextColorId}
                  onApplyDuo={handleApplyDuo}
                />

                {/* 3. Lettering Color (Foreground) */}
                <ColorPicker
                  label="Lettering Color (Top Layer)"
                  sublabel="Embossed extruded name color"
                  colors={colors}
                  selectedId={selectedTextColorId}
                  onSelect={setSelectedTextColorId}
                />

                {/* 4. Baseplate Color (Background Key) */}
                <ColorPicker
                  label="Key Background Color (Contour Base)"
                  sublabel="Solid backplate and eyelet ring"
                  colors={colors}
                  selectedId={selectedBaseColorId}
                  onSelect={setSelectedBaseColorId}
                />

                {/* 5. Form Factor / Style Selector */}
                <StyleSelector
                  styles={styles}
                  selectedId={selectedStyleId}
                  onSelect={setSelectedStyleId}
                />
              </div>

              {/* Sticky Action Footer */}
              <div className="px-5 py-3 border-t border-[#E2E8F0] bg-[#F8FAFC] shrink-0 flex items-center justify-between gap-3 sticky bottom-0 z-20 shadow-xs lg:static lg:shadow-none rounded-b-2xl lg:rounded-none">
                <div>
                  <div className="text-base font-extrabold text-[#0F172A] leading-tight">
                    ৳{selectedStyle?.basePrice ? (selectedStyle.basePrice).toFixed(2) : "5.99"}
                  </div>
                  <span className="text-[10px] text-[#64748B]">
                    Two-tone print + split ring included
                  </span>
                </div>

                <button
                  onClick={handleOrderNow}
                  disabled={!text.trim() || !selectedStyleId || !selectedTextColorId}
                  className="h-10 px-5 bg-[#0F172A] hover:bg-[#020617] disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-lg font-semibold text-xs transition-all shadow-xs active:scale-[0.99] flex items-center gap-2 shrink-0 cursor-pointer"
                >
                  <span>Order Custom Key</span>
                  <FontAwesomeIcon icon={faArrowRight} className="text-xs" />
                </button>
              </div>
            </aside>
          </div>
        </div>
      </section>

      {/* ── Materials & Palette Section ── */}
      <section id="materials" className="py-16 bg-white border-t border-[#E2E8F0]">
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center max-w-xl mx-auto mb-12 space-y-2">
            <span className="text-xs font-bold text-[#059669] uppercase tracking-wider bg-[#059669]/10 px-2.5 py-1 rounded">
              Filament Engineering
            </span>
            <h2 className="text-2xl md:text-3xl font-extrabold text-[#0F172A] tracking-tight">
              12 Premium Filament Colors Available
            </h2>
            <p className="text-sm text-[#64748B]">
              High-adhesion polymers engineered specifically for crisp two-tone color transitions without bleeding.
            </p>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
            {colors.map((c) => (
              <div
                key={c.id}
                className="border border-[#E2E8F0] rounded-xl p-3 text-center bg-[#F8FAFC] space-y-2"
              >
                <div
                  className="w-10 h-10 rounded-full mx-auto border border-black/10 shadow-xs"
                  style={{ backgroundColor: c.hexCode }}
                />
                <div>
                  <div className="text-xs font-bold text-[#0F172A] truncate">
                    {c.name}
                  </div>
                  <div className="text-[10px] text-[#64748B] font-mono">
                    {c.materialType} • In Stock
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Serene Clinical Footer ── */}
      <footer className="bg-[#0F172A] text-white py-12 border-t border-[#1E293B]">
        <div className="max-w-6xl mx-auto px-6">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6 pb-8 border-b border-[#1E293B]">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-white flex items-center justify-center text-[#0F172A] font-bold text-sm">
                P
              </div>
              <div>
                <span className="font-bold text-base tracking-tight text-white">
                  Print<span className="text-[#059669]">X3D</span>
                </span>
                <p className="text-xs text-[#94A3B8]">
                  Two-Tone 3D Name Keychains & Fabrication
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-6 text-xs text-[#94A3B8]">
              <button
                type="button"
                onClick={scrollToStudio}
                className="hover:text-white transition-colors"
              >
                Custom Key Studio
              </button>
              <a href="#how-it-works" className="hover:text-white transition-colors">
                Contour Backplate
              </a>
              <a href="/track/example" className="hover:text-white transition-colors">
                Track Order
              </a>
            </div>
          </div>

          <div className="pt-6 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-[#64748B]">
            <p>© {new Date().getFullYear()} PrintX3D. Precision On-Demand Two-Tone 3D Fabrication.</p>
            <p className="font-mono">Verdana Health Design System • 8px Radius</p>
          </div>
        </div>
      </footer>

      {/* ── Direct Fast Order Modal ── */}
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
