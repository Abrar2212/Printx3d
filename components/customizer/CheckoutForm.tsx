"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { FONT_STYLE_OPTIONS, type Style, type FilamentColor, type StyleConfig } from "@/types";

interface Props {
  styles: (Style & { config: StyleConfig })[];
  colors: FilamentColor[];
  defaultStyleId: string | null;
  defaultColorId: string | null;
  defaultBaseColorId: string | null;
  defaultFontStyle: string;
  defaultText: string;
}

export default function CheckoutForm({
  styles,
  colors,
  defaultStyleId,
  defaultColorId,
  defaultBaseColorId,
  defaultFontStyle,
  defaultText,
}: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const defaultBase =
    colors.find((c) => c.id === defaultBaseColorId) ||
    colors.find((c) => c.hexCode === "#111111") ||
    colors[0];

  const defaultTextCol =
    colors.find((c) => c.id === defaultColorId) ||
    colors.find((c) => c.hexCode === "#FF6600") ||
    colors[1] ||
    colors[0];

  const [form, setForm] = useState({
    customText: defaultText || "Custom Key",
    styleId: defaultStyleId ?? styles[0]?.id ?? "",
    colorId: defaultTextCol?.id ?? colors[0]?.id ?? "",
    baseColorId: defaultBase?.id ?? colors[0]?.id ?? "",
    fontStyle: defaultFontStyle || "helvetiker_bold",
    quantity: 1,
    customerName: "",
    customerEmail: "",
    customerPhone: "",
    shippingAddress: "",
  });

  const selectedStyle = styles.find((s) => s.id === form.styleId);
  const selectedTextColor = colors.find((c) => c.id === form.colorId);
  const selectedBaseColor = colors.find((c) => c.id === form.baseColorId);
  const selectedFont = FONT_STYLE_OPTIONS.find((f) => f.id === form.fontStyle);

  const total = selectedStyle ? selectedStyle.basePrice * form.quantity : 0;

  const set = (k: keyof typeof form, v: string | number) =>
    setForm((prev) => ({ ...prev, [k]: v }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error ?? "Failed to register order.");
        return;
      }

      setSuccess(data.id);
      setTimeout(() => router.push(`/track/${data.id}`), 1200);
    } catch {
      setError("Network timeout. Please check your connection and retry.");
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] flex items-center justify-center p-6 text-[#0F172A]">
        <div className="bg-white border border-[#E2E8F0] rounded-xl p-8 max-w-md w-full text-center space-y-4 shadow-md">
          <div className="w-12 h-12 rounded-full bg-[#059669]/10 text-[#059669] flex items-center justify-center mx-auto text-xl font-bold">
            ✓
          </div>
          <h2 className="text-xl font-bold text-[#0F172A]">
            Two-Tone Key Order Logged!
          </h2>
          <p className="text-sm text-[#64748B]">
            Order <span className="font-mono text-[#0F172A]">#{success.slice(0, 8)}</span> has been securely entered into our 3D print queue.
          </p>
          <div className="pt-2">
            <span className="text-xs text-[#64748B] animate-pulse">
              Transferring to order tracking portal…
            </span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-[#0F172A]">
      {/* ── Navigation Header ── */}
      <header className="bg-white border-b border-[#E2E8F0] px-6 py-3.5 flex items-center justify-between shadow-xs sticky top-0 z-10">
        <div className="flex items-center gap-4">
          <a
            href="/"
            className="text-xs font-semibold text-[#64748B] hover:text-[#0F172A] transition-colors"
          >
            ← Back to Customizer
          </a>
          <span className="text-[#CBD5E1]">|</span>
          <h1 className="text-base font-bold text-[#0F172A]">
            Two-Tone Key Checkout Specification
          </h1>
        </div>
      </header>

      <div className="max-w-2xl mx-auto p-6 md:p-8 space-y-6">
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* ── Section: Specifications ── */}
          <div className="bg-white border border-[#E2E8F0] rounded-xl p-6 space-y-5 shadow-sm">
            <div className="border-b border-[#E2E8F0] pb-3">
              <h2 className="text-base font-bold text-[#0F172A]">
                1. Two-Tone Model Specifications
              </h2>
              <p className="text-xs text-[#64748B] mt-0.5">
                Verify your embossed lettering, font selection, and dual-layer filament combination.
              </p>
            </div>

            {/* Custom text */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-[#0F172A] uppercase tracking-wider">
                Embossed Custom Lettering *
              </label>
              <input
                required
                maxLength={60}
                value={form.customText}
                onChange={(e) => set("customText", e.target.value)}
                placeholder="Name or word"
                className="w-full h-[42px] px-3.5 rounded-lg bg-white border border-[#E2E8F0] text-sm text-[#0F172A] focus:outline-none focus:border-[#0F172A] focus:ring-2 focus:ring-[#0F172A]/10 transition-all font-mono font-bold"
              />
            </div>

            {/* Font Style Selection */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-[#0F172A] uppercase tracking-wider">
                3D Font Style *
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {FONT_STYLE_OPTIONS.map((f) => (
                  <button
                    key={f.id}
                    type="button"
                    onClick={() => set("fontStyle", f.id)}
                    className={`p-2.5 rounded-lg border text-left transition-all ${
                      form.fontStyle === f.id
                        ? "border-[#0F172A] bg-[#0F172A]/[0.03] ring-1 ring-[#0F172A]"
                        : "border-[#E2E8F0] bg-white hover:border-[#CBD5E1]"
                    }`}
                  >
                    <div className="text-xs font-bold text-[#0F172A]">{f.name}</div>
                    <div className="text-[10px] text-[#64748B] truncate">{f.family}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Two-Tone Visual Preview Badge */}
            <div className="p-3 bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="relative w-8 h-8 rounded-lg border border-black/15 overflow-hidden shadow-2xs">
                  <div
                    className="absolute inset-0"
                    style={{ backgroundColor: selectedBaseColor?.hexCode ?? "#111111" }}
                  />
                  <div
                    className="absolute inset-1.5 rounded-full border border-black/20"
                    style={{ backgroundColor: selectedTextColor?.hexCode ?? "#FF6600" }}
                  />
                </div>
                <div>
                  <div className="text-xs font-bold text-[#0F172A]">
                    {selectedTextColor?.name} text on {selectedBaseColor?.name} base
                  </div>
                  <div className="text-[11px] text-[#64748B]">
                    Font: {selectedFont?.name} · Contour plate with eyelet ring
                  </div>
                </div>
              </div>
            </div>

            {/* Text Color Selection */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-[#0F172A] uppercase tracking-wider">
                Embossed Text Color (Top) *
              </label>
              <div className="flex flex-wrap gap-2">
                {colors.map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => set("colorId", c.id)}
                    title={`${c.name}`}
                    className={`w-8 h-8 rounded-lg border flex items-center justify-center transition-all ${
                      form.colorId === c.id
                        ? "border-[#0F172A] ring-2 ring-[#0F172A]/30 scale-105"
                        : "border-[#CBD5E1] hover:border-[#64748B]"
                    }`}
                    style={{ backgroundColor: c.hexCode }}
                  />
                ))}
              </div>
            </div>

            {/* Baseplate Color Selection */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-[#0F172A] uppercase tracking-wider">
                Key Background Plate Color (Base) *
              </label>
              <div className="flex flex-wrap gap-2">
                {colors.map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => set("baseColorId", c.id)}
                    title={`${c.name}`}
                    className={`w-8 h-8 rounded-lg border flex items-center justify-center transition-all ${
                      form.baseColorId === c.id
                        ? "border-[#0F172A] ring-2 ring-[#0F172A]/30 scale-105"
                        : "border-[#CBD5E1] hover:border-[#64748B]"
                    }`}
                    style={{ backgroundColor: c.hexCode }}
                  />
                ))}
              </div>
            </div>

            {/* Style selector */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-[#0F172A] uppercase tracking-wider">
                Product Specification *
              </label>
              <div className="grid grid-cols-3 gap-2">
                {styles.map((s) => (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => set("styleId", s.id)}
                    className={`p-2.5 rounded-lg border text-left transition-all ${
                      form.styleId === s.id
                        ? "border-[#0F172A] bg-[#0F172A]/[0.02] ring-1 ring-[#0F172A]"
                        : "border-[#E2E8F0] bg-white hover:border-[#CBD5E1]"
                    }`}
                  >
                    <div className="text-xs font-semibold text-[#0F172A] truncate">
                      {s.name}
                    </div>
                    <div className="text-xs font-mono text-[#059669] mt-0.5">
                      ৳{s.basePrice.toFixed(2)}
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Quantity */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-[#0F172A] uppercase tracking-wider">
                Print Unit Quantity
              </label>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => set("quantity", Math.max(1, form.quantity - 1))}
                  className="w-10 h-10 rounded-lg border border-[#E2E8F0] bg-white hover:bg-[#F8FAFC] text-[#0F172A] font-bold text-base transition-colors"
                >
                  −
                </button>
                <span className="text-base font-bold font-mono text-[#0F172A] w-8 text-center">
                  {form.quantity}
                </span>
                <button
                  type="button"
                  onClick={() => set("quantity", Math.min(20, form.quantity + 1))}
                  className="w-10 h-10 rounded-lg border border-[#E2E8F0] bg-white hover:bg-[#F8FAFC] text-[#0F172A] font-bold text-base transition-colors"
                >
                  +
                </button>
              </div>
            </div>
          </div>

          {/* ── Section: Customer & Delivery Info ── */}
          <div className="bg-white border border-[#E2E8F0] rounded-xl p-6 space-y-4 shadow-sm">
            <div className="border-b border-[#E2E8F0] pb-3">
              <h2 className="text-base font-bold text-[#0F172A]">
                2. Shipping & Contact Details
              </h2>
              <p className="text-xs text-[#64748B] mt-0.5">
                Delivery destination for your custom manufactured keys.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-[#0F172A] uppercase tracking-wider flex items-center justify-between">
                  <span>Phone Number *</span>
                  <span className="text-[10px] text-[#059669] font-normal lowercase">Required</span>
                </label>
                <input
                  required
                  type="tel"
                  value={form.customerPhone}
                  onChange={(e) => set("customerPhone", e.target.value)}
                  placeholder="e.g. 01700-000000"
                  className="w-full h-[42px] px-3.5 rounded-lg bg-white border border-[#E2E8F0] text-sm text-[#0F172A] focus:outline-none focus:border-[#0F172A] focus:ring-2 focus:ring-[#0F172A]/10 transition-all font-mono"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-[#0F172A] uppercase tracking-wider">
                  Full Name <span className="text-[#94A3B8] font-normal">(Optional)</span>
                </label>
                <input
                  value={form.customerName}
                  onChange={(e) => set("customerName", e.target.value)}
                  placeholder="Recipient Name"
                  className="w-full h-[42px] px-3.5 rounded-lg bg-white border border-[#E2E8F0] text-sm text-[#0F172A] focus:outline-none focus:border-[#0F172A] focus:ring-2 focus:ring-[#0F172A]/10 transition-all"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-[#0F172A] uppercase tracking-wider flex items-center justify-between">
                <span>Full Delivery Address *</span>
                <span className="text-[10px] text-[#64748B] font-normal lowercase">Home / Office</span>
              </label>
              <textarea
                required
                rows={3}
                value={form.shippingAddress}
                onChange={(e) => set("shippingAddress", e.target.value)}
                placeholder="House, Road, Area, City/District"
                className="w-full p-3.5 rounded-lg bg-white border border-[#E2E8F0] text-sm text-[#0F172A] focus:outline-none focus:border-[#0F172A] focus:ring-2 focus:ring-[#0F172A]/10 transition-all resize-none"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-[#0F172A] uppercase tracking-wider">
                Email Address <span className="text-[#94A3B8] font-normal">(Optional)</span>
              </label>
              <input
                type="email"
                value={form.customerEmail}
                onChange={(e) => set("customerEmail", e.target.value)}
                placeholder="name@domain.com (optional)"
                className="w-full h-[42px] px-3.5 rounded-lg bg-white border border-[#E2E8F0] text-sm text-[#0F172A] focus:outline-none focus:border-[#0F172A] focus:ring-2 focus:ring-[#0F172A]/10 transition-all"
              />
            </div>
          </div>

          {/* ── Summary & Order Placement ── */}
          <div className="bg-white border border-[#E2E8F0] rounded-xl p-6 space-y-3 shadow-sm">
            <div className="flex justify-between text-sm text-[#64748B]">
              <span>
                "{form.customText}" ({selectedStyle?.name ?? "Custom Key"}) × {form.quantity}
              </span>
              <span className="font-mono text-[#0F172A]">৳{total.toFixed(2)}</span>
            </div>
            <div className="flex justify-between font-bold text-lg border-t border-[#E2E8F0] pt-3 text-[#0F172A]">
              <span>Total Payable</span>
              <span className="font-mono text-[#059669]">৳{total.toFixed(2)}</span>
            </div>
            <p className="text-xs text-[#64748B]">
              Hardware Included: Split keyring & jump chain. Payment on fulfillment or transfer.
            </p>
          </div>

          {error && (
            <div className="bg-[#EF4444]/10 border border-[#EF4444]/20 rounded-lg p-4 text-xs font-semibold text-[#EF4444]">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full h-[48px] bg-[#0F172A] hover:bg-[#020617] disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-lg font-semibold text-sm transition-all shadow-sm active:scale-[0.99] flex items-center justify-center gap-2"
          >
            {loading ? "Logging Fabrication Order…" : "Submit Two-Tone Key Order →"}
          </button>
        </form>
      </div>
    </div>
  );
}
