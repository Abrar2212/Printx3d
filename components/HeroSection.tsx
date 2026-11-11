"use client";

import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faCheck, faArrowDown } from "@fortawesome/free-solid-svg-icons";

interface HeroSectionProps {
  onScrollToStudio: () => void;
  onQuickTextSelect?: (text: string) => void;
}

export default function HeroSection({
  onScrollToStudio,
  onQuickTextSelect,
}: HeroSectionProps) {
  const sampleKeys = [
    { label: "Baba (Blaze)", text: "Baba", baseHex: "#111111", textHex: "#FF6600" },
    { label: "Imran (Sun)", text: "Imran", baseHex: "#111111", textHex: "#FFD000" },
    { label: "Prova (Rose)", text: "Prova", baseHex: "#111111", textHex: "#FF2E93" },
    { label: "ESC (Crimson)", text: "ESC", baseHex: "#F8FAFC", textHex: "#E50914" },
    { label: "Tuhin (Azure)", text: "Tuhin", baseHex: "#111111", textHex: "#00A3FF" },
  ];

  return (
    <section className="relative overflow-hidden bg-gradient-to-b from-[#F8FAFC] via-white to-[#F8FAFC] border-b border-[#E2E8F0] pt-12 pb-16 md:pt-20 md:pb-24" suppressHydrationWarning>
      {/* ── Soft Ambient Glow Background Orbs ── */}
      <div
        className="pointer-events-none absolute -top-24 left-1/2 -translate-x-1/2 w-[720px] h-[360px] bg-gradient-to-tr from-[#059669]/10 via-[#0EA5E9]/5 to-transparent blur-3xl opacity-70"
        aria-hidden="true"
      />

      <div className="max-w-6xl mx-auto px-6 relative z-10">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          {/* ── Left Column: Editorial & Value Proposition ── */}
          <div className="lg:col-span-7 space-y-6 text-left">
            {/* Pill Badge */}
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#059669]/10 border border-[#059669]/20 text-[#059669] text-xs font-semibold shadow-xs">
              <span className="w-1.5 h-1.5 rounded-full bg-[#059669] animate-pulse" />
              <span>3D Printed Keychains</span>
            </div>

            {/* Main Headline */}
            <h1 className="text-4xl sm:text-5xl md:text-6xl font-extrabold text-[#0F172A] tracking-tight leading-[1.12]">
              Make your own <br />
              <span className="text-[#059669]">custom key</span>.
            </h1>

            {/* Body */}
            <p className="text-base sm:text-lg text-[#64748B] max-w-xl leading-relaxed">
              Personalized two-tone 3D keychains. Pick your colors, font, and custom name with instant 3D preview.
            </p>

            {/* Quick Presets / Try It Out */}
            <div className="space-y-2 pt-1">
              <span className="text-xs font-semibold text-[#0F172A] uppercase tracking-wider block">
                Popular presets:
              </span>
              <div className="flex flex-wrap gap-2">
                {sampleKeys.map((item) => (
                  <button
                    key={item.text}
                    type="button"
                    onClick={() => {
                      if (onQuickTextSelect) onQuickTextSelect(item.text);
                      onScrollToStudio();
                    }}
                    className="group inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white border border-[#E2E8F0] hover:border-[#0F172A] text-xs font-medium text-[#0F172A] transition-all shadow-xs hover:shadow-sm"
                  >
                    <div className="relative w-3.5 h-3.5 rounded-full border border-black/15 overflow-hidden flex-shrink-0">
                      <div className="absolute inset-0" style={{ backgroundColor: item.baseHex }} />
                      <div
                        className="absolute inset-0.5 rounded-full"
                        style={{ backgroundColor: item.textHex }}
                      />
                    </div>
                    <span>{item.label}</span>
                    <span className="font-mono text-[#64748B] group-hover:text-[#0F172A]">
                      "{item.text}"
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* Actions */}
            <div className="flex flex-wrap items-center gap-4 pt-4">
              <button
                type="button"
                onClick={onScrollToStudio}
                className="h-[48px] px-7 rounded-lg bg-[#0F172A] hover:bg-[#020617] text-white text-sm font-semibold transition-all shadow-sm flex items-center gap-2 active:scale-[0.99] cursor-pointer"
              >
                <span>Customize Your Key</span>
                <FontAwesomeIcon icon={faArrowDown} className="text-xs" />
              </button>

              <a
                href="/track/example"
                className="h-[48px] px-6 rounded-lg bg-white border border-[#E2E8F0] hover:border-[#CBD5E1] text-[#0F172A] text-sm font-semibold transition-all shadow-xs flex items-center justify-center hover:bg-[#F8FAFC]"
              >
                Track Order
              </a>
            </div>

            {/* Micro Trust Points */}
            <div className="grid grid-cols-3 gap-4 pt-4 border-t border-[#E2E8F0] text-xs text-[#64748B]">
              <div className="flex items-center gap-2">
                <FontAwesomeIcon icon={faCheck} className="text-[#059669] text-xs" />
                <span>Contour Backplate Base</span>
              </div>
              <div className="flex items-center gap-2">
                <FontAwesomeIcon icon={faCheck} className="text-[#059669] text-xs" />
                <span>Stainless Keyring Hardware</span>
              </div>
              <div className="flex items-center gap-2">
                <FontAwesomeIcon icon={faCheck} className="text-[#059669] text-xs" />
                <span>12 Vibrant Filaments</span>
              </div>
            </div>
          </div>

          {/* ── Right Column: Soothing Interactive Key Showcase Card ── */}
          <div className="lg:col-span-5">
            <div className="relative mx-auto max-w-sm lg:max-w-none">
              {/* Decorative Subtle Shadow Layer */}
              <div className="absolute -inset-1.5 bg-gradient-to-r from-[#059669]/15 to-[#0EA5E9]/15 rounded-2xl blur-lg opacity-60" />

              {/* Main Clinical Card */}
              <div className="relative bg-white border border-[#E2E8F0] rounded-2xl p-6 shadow-md space-y-5 text-left">
                {/* Header */}
                <div className="flex items-center justify-between border-b border-[#E2E8F0] pb-3">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-[#059669]" />
                    <span className="font-mono text-xs font-bold text-[#0F172A] uppercase tracking-wider">
                      SPECIMEN • TWO-TONE KEY
                    </span>
                  </div>
                  <span className="text-[11px] font-semibold text-[#059669] bg-[#059669]/10 px-2 py-0.5 rounded uppercase font-mono">
                    Contour Plate
                  </span>
                </div>

                {/* Visual Representation of the Two-Tone 3D Key from the photo */}
                <div className="bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl p-6 relative overflow-hidden flex flex-col items-center justify-center min-h-[190px] select-none">
                  {/* Subtle Grid texture */}
                  <div
                    className="absolute inset-0 opacity-[0.04] pointer-events-none"
                    style={{
                      backgroundImage:
                        "radial-gradient(#0F172A 1px, transparent 1px)",
                      backgroundSize: "12px 12px",
                    }}
                  />

                  {/* Keychain Physical Representation Diagram Matching Real Product */}
                  <div className="flex items-center z-10 transition-transform hover:scale-105 duration-300">
                    {/* Metal Key Ring Hardware */}
                    <div className="flex items-center -mr-1">
                      <div className="w-9 h-9 rounded-full border-[3px] border-[#CBD5E1] shadow-xs flex items-center justify-center bg-white/40">
                        <div className="w-4 h-4 rounded-full border border-[#94A3B8]" />
                      </div>
                      <div className="w-3 h-1.5 bg-[#94A3B8] rounded -ml-1" />
                    </div>

                    {/* Integrated Baseplate Loop */}
                    <div className="w-8 h-8 rounded-full bg-[#111111] flex items-center justify-center -mr-2 z-10 shadow-sm border border-black/40">
                      <div className="w-3.5 h-3.5 rounded-full bg-[#F8FAFC]" />
                    </div>

                    {/* Key Contour Backplate (Black) with Embossed Orange Text */}
                    <div className="relative bg-[#111111] rounded-xl px-5 py-3 shadow-md border border-black/50 z-20 flex items-center">
                      <span className="font-extrabold text-[#FF6600] text-xl tracking-wider font-mono drop-shadow-[0_2px_4px_rgba(0,0,0,0.5)]">
                        Imran
                      </span>
                    </div>
                  </div>

                  {/* Dimension Annotations */}
                  <div className="flex justify-between w-full text-[10px] text-[#64748B] font-mono mt-5 pt-3 border-t border-[#E2E8F0] z-10">
                    <span>Base: Matte Black PLA</span>
                    <span>Text: Flame Orange</span>
                    <span>Eyelet: 4.5 mm</span>
                  </div>
                </div>

                {/* Specs List */}
                <div className="space-y-2 text-xs">
                  <div className="flex justify-between text-[#64748B]">
                    <span>Background Base</span>
                    <span className="font-medium text-[#0F172A]">
                      3.2mm Smooth-Bevel Contour Plate
                    </span>
                  </div>
                  <div className="flex justify-between text-[#64748B]">
                    <span>Lettering Layer</span>
                    <span className="font-medium text-[#0F172A]">
                      Embossed High-Contrast Filament
                    </span>
                  </div>
                  <div className="flex justify-between text-[#64748B]">
                    <span>Hardware Fitting</span>
                    <span className="font-medium text-[#0F172A]">
                      Included Stainless Split Ring
                    </span>
                  </div>
                </div>

                {/* Direct Action */}
                <button
                  type="button"
                  onClick={onScrollToStudio}
                  className="w-full h-[42px] bg-[#0F172A] hover:bg-[#020617] text-white font-semibold text-xs rounded-lg transition-colors flex items-center justify-center gap-2 shadow-xs"
                >
                  <span>Build This Key in 3D Studio</span>
                  <span>→</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
