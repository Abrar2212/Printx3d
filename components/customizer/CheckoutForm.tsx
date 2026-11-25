"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import MaterialSelector from "./MaterialSelector";
import SiteHeader from "@/components/SiteHeader";
import { FONT_STYLE_OPTIONS, type Style, type FilamentColor, type StyleConfig } from "@/types";
import { MATERIALS, colorsFor } from "@/lib/materials";

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

  const materials = MATERIALS.filter((m) => colors.some((c) => c.materials.includes(m.id)));

  const [form, setForm] = useState({
    customText: defaultText || "Custom Key",
    styleId: defaultStyleId ?? styles[0]?.id ?? "",
    material: (materials[0]?.id ?? "PLA") as string,
    colorId: defaultColorId ?? "",
    baseColorId: defaultBaseColorId ?? "",
    fontStyle: defaultFontStyle || "helvetiker_bold",
    quantity: 1,
    customerName: "",
    customerEmail: "",
    customerPhone: "",
    shippingAddress: "",
  });

  const selectedStyle = styles.find((s) => s.id === form.styleId);
  const {
    available,
    text: selectedTextColor,
    base: selectedBaseColor,
  } = colorsFor(colors, form.material, form.colorId, form.baseColorId);
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
        body: JSON.stringify({ ...form, colorId: selectedTextColor?.id ?? "", baseColorId: selectedBaseColor?.id }),
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
      <div className="min-h-screen bg-bg flex items-center justify-center p-6 text-primary-navy">
        <div className="bg-white border border-border rounded-xl p-8 max-w-md w-full text-center space-y-4 shadow-md">
          <div className="w-12 h-12 rounded-full bg-tertiary-sage/10 text-tertiary-sage flex items-center justify-center mx-auto text-xl font-bold">
            ✓
          </div>
          <h2 className="text-xl font-bold text-primary-navy">
            Two-Tone Key Order Logged!
          </h2>
          <p className="text-sm text-secondary-slate">
            Order <span className="font-mono text-primary-navy">#{success.slice(0, 8)}</span> has been securely entered into our 3D print queue.
          </p>
          <div className="pt-2">
            <span className="text-xs text-secondary-slate animate-pulse">
              Transferring to order tracking portal…
            </span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-bg text-primary-navy">
      {/* ── Navigation Header ── */}
      <SiteHeader />

      <div className="max-w-2xl mx-auto p-6 md:p-8 space-y-6">
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* ── Section: Specifications ── */}
          <div className="bg-white border border-border rounded-xl p-6 space-y-5 shadow-sm">
            <div className="border-b border-border pb-3">
              <h2 className="text-base font-bold text-primary-navy">
                1. Two-Tone Model Specifications
              </h2>
              <p className="text-xs text-secondary-slate mt-0.5">
                Verify your embossed lettering, font selection, and dual-layer filament combination.
              </p>
            </div>

            {/* Custom text */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-primary-navy uppercase tracking-wider">
                Embossed Custom Lettering *
              </label>
              <input
                required
                maxLength={60}
                value={form.customText}
                onChange={(e) => set("customText", e.target.value)}
                placeholder="Name or word"
                className="w-full h-[42px] px-3.5 rounded-lg bg-white border border-border text-sm text-primary-navy focus:outline-none focus:border-primary-navy focus:ring-2 focus:ring-primary-navy/10 transition-all font-mono font-bold"
              />
            </div>

            {/* Font Style Selection */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-primary-navy uppercase tracking-wider">
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
                        ? "border-primary-navy bg-primary-navy/[0.03] ring-1 ring-primary-navy"
                        : "border-border bg-white hover:border-border-subtle"
                    }`}
                  >
                    <div className="text-xs font-bold text-primary-navy">{f.name}</div>
                    <div className="text-[10px] text-secondary-slate truncate">{f.family}</div>
                  </button>
                ))}
              </div>
            </div>

            <MaterialSelector materials={materials} selectedId={form.material} onSelect={(id) => set("material", id)} />

            {/* Two-Tone Visual Preview Badge */}
            <div className="p-3 bg-bg border border-border rounded-lg flex items-center justify-between">
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
                  <div className="text-xs font-bold text-primary-navy">
                    {selectedTextColor?.name} text on {selectedBaseColor?.name} base
                  </div>
                  <div className="text-[11px] text-secondary-slate">
                    Font: {selectedFont?.name} · Contour plate with eyelet ring
                  </div>
                </div>
              </div>
            </div>

            {/* Text Color Selection */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-primary-navy uppercase tracking-wider">
                Embossed Text Color (Top) *
              </label>
              <div className="flex flex-wrap gap-2">
                {available.map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => set("colorId", c.id)}
                    title={`${c.name}`}
                    className={`w-8 h-8 rounded-lg border flex items-center justify-center transition-all ${
                      selectedTextColor?.id === c.id
                        ? "border-primary-navy ring-2 ring-primary-navy/30 scale-105"
                        : "border-border-subtle hover:border-secondary-slate"
                    }`}
                    style={{ backgroundColor: c.hexCode }}
                  />
                ))}
              </div>
            </div>

            {/* Baseplate Color Selection */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-primary-navy uppercase tracking-wider">
                Key Background Plate Color (Base) *
              </label>
              <div className="flex flex-wrap gap-2">
                {available.map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => set("baseColorId", c.id)}
                    title={`${c.name}`}
                    className={`w-8 h-8 rounded-lg border flex items-center justify-center transition-all ${
                      selectedBaseColor?.id === c.id
                        ? "border-primary-navy ring-2 ring-primary-navy/30 scale-105"
                        : "border-border-subtle hover:border-secondary-slate"
                    }`}
                    style={{ backgroundColor: c.hexCode }}
                  />
                ))}
              </div>
            </div>

            {/* Style selector */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-primary-navy uppercase tracking-wider">
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
                        ? "border-primary-navy bg-primary-navy/[0.02] ring-1 ring-primary-navy"
                        : "border-border bg-white hover:border-border-subtle"
                    }`}
                  >
                    <div className="text-xs font-semibold text-primary-navy truncate">
                      {s.name}
                    </div>
                    <div className="text-xs font-mono text-tertiary-sage mt-0.5">
                      ৳{s.basePrice.toFixed(2)}
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Quantity */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-primary-navy uppercase tracking-wider">
                Print Unit Quantity
              </label>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => set("quantity", Math.max(1, form.quantity - 1))}
                  className="w-10 h-10 rounded-lg border border-border bg-white hover:bg-bg text-primary-navy font-bold text-base transition-colors"
                >
                  −
                </button>
                <span className="text-base font-bold font-mono text-primary-navy w-8 text-center">
                  {form.quantity}
                </span>
                <button
                  type="button"
                  onClick={() => set("quantity", Math.min(20, form.quantity + 1))}
                  className="w-10 h-10 rounded-lg border border-border bg-white hover:bg-bg text-primary-navy font-bold text-base transition-colors"
                >
                  +
                </button>
              </div>
            </div>
          </div>

          {/* ── Section: Customer & Delivery Info ── */}
          <div className="bg-white border border-border rounded-xl p-6 space-y-4 shadow-sm">
            <div className="border-b border-border pb-3">
              <h2 className="text-base font-bold text-primary-navy">
                2. Shipping & Contact Details
              </h2>
              <p className="text-xs text-secondary-slate mt-0.5">
                Delivery destination for your custom manufactured keys.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-primary-navy uppercase tracking-wider flex items-center justify-between">
                  <span>Phone Number *</span>
                  <span className="text-[10px] text-tertiary-sage font-normal lowercase">Required</span>
                </label>
                <input
                  required
                  type="tel"
                  value={form.customerPhone}
                  onChange={(e) => set("customerPhone", e.target.value)}
                  placeholder="e.g. 01700-000000"
                  className="w-full h-[42px] px-3.5 rounded-lg bg-white border border-border text-sm text-primary-navy focus:outline-none focus:border-primary-navy focus:ring-2 focus:ring-primary-navy/10 transition-all font-mono"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-primary-navy uppercase tracking-wider">
                  Full Name <span className="text-muted font-normal">(Optional)</span>
                </label>
                <input
                  value={form.customerName}
                  onChange={(e) => set("customerName", e.target.value)}
                  placeholder="Recipient Name"
                  className="w-full h-[42px] px-3.5 rounded-lg bg-white border border-border text-sm text-primary-navy focus:outline-none focus:border-primary-navy focus:ring-2 focus:ring-primary-navy/10 transition-all"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-primary-navy uppercase tracking-wider flex items-center justify-between">
                <span>Full Delivery Address *</span>
                <span className="text-[10px] text-secondary-slate font-normal lowercase">Home / Office</span>
              </label>
              <textarea
                required
                rows={3}
                value={form.shippingAddress}
                onChange={(e) => set("shippingAddress", e.target.value)}
                placeholder="House, Road, Area, City/District"
                className="w-full p-3.5 rounded-lg bg-white border border-border text-sm text-primary-navy focus:outline-none focus:border-primary-navy focus:ring-2 focus:ring-primary-navy/10 transition-all resize-none"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-primary-navy uppercase tracking-wider">
                Email Address <span className="text-muted font-normal">(Optional)</span>
              </label>
              <input
                type="email"
                value={form.customerEmail}
                onChange={(e) => set("customerEmail", e.target.value)}
                placeholder="name@domain.com (optional)"
                className="w-full h-[42px] px-3.5 rounded-lg bg-white border border-border text-sm text-primary-navy focus:outline-none focus:border-primary-navy focus:ring-2 focus:ring-primary-navy/10 transition-all"
              />
            </div>
          </div>

          {/* ── Summary & Order Placement ── */}
          <div className="bg-white border border-border rounded-xl p-6 space-y-3 shadow-sm">
            <div className="flex justify-between text-sm text-secondary-slate">
              <span>
                "{form.customText}" ({selectedStyle?.name ?? "Custom Key"}) × {form.quantity}
              </span>
              <span className="font-mono text-primary-navy">৳{total.toFixed(2)}</span>
            </div>
            <div className="flex justify-between font-bold text-lg border-t border-border pt-3 text-primary-navy">
              <span>Total Payable</span>
              <span className="font-mono text-tertiary-sage">৳{total.toFixed(2)}</span>
            </div>
            <p className="text-xs text-secondary-slate">
              Hardware Included: Split keyring & jump chain. Payment on fulfillment or transfer.
            </p>
          </div>

          {error && (
            <div className="bg-error/10 border border-error/20 rounded-lg p-4 text-xs font-semibold text-error">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full h-[48px] bg-primary-navy hover:bg-primary-navy-hover disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-lg font-semibold text-sm transition-all shadow-sm active:scale-[0.99] flex items-center justify-center gap-2"
          >
            {loading ? "Logging Fabrication Order…" : "Submit Two-Tone Key Order →"}
          </button>
        </form>
      </div>
    </div>
  );
}
