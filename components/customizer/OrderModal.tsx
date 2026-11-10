"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faCheck,
  faXmark,
  faCopy,
  faArrowRight,
  faPlus,
  faMinus,
} from "@fortawesome/free-solid-svg-icons";
import type { Style, FilamentColor } from "@/types";

interface OrderModalProps {
  isOpen: boolean;
  onClose: () => void;
  customText: string;
  selectedStyle: Style | null;
  selectedTextColor: FilamentColor | null;
  selectedBaseColor: FilamentColor | null;
  selectedFontStyle: string;
}

export default function OrderModal({
  isOpen,
  onClose,
  customText,
  selectedStyle,
  selectedTextColor,
  selectedBaseColor,
  selectedFontStyle,
}: OrderModalProps) {
  const router = useRouter();
  const [quantity, setQuantity] = useState(1);
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Success state with generated order details
  const [orderResult, setOrderResult] = useState<{
    id: string;
    orderCode: string;
    phone: string;
    address: string;
    totalPrice: number;
  } | null>(null);

  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const unitPrice = selectedStyle ? Number(selectedStyle.basePrice) : 5.99;
  const totalPrice = unitPrice * quantity;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!phone.trim()) {
      setError("Please enter your phone number so we can reach you.");
      return;
    }
    if (!address.trim()) {
      setError("Please enter your delivery address.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const payload = {
        customText: customText.trim(),
        styleId: selectedStyle?.id || "style-keychain",
        colorId: selectedTextColor?.id,
        baseColorId: selectedBaseColor?.id || null,
        fontStyle: selectedFontStyle,
        quantity,
        customerName: name.trim() || "Customer",
        customerPhone: phone.trim(),
        shippingAddress: address.trim(),
      };

      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Failed to place order. Please try again.");
        return;
      }

      setOrderResult({
        id: data.id,
        orderCode: data.orderCode || `PX-${data.id.slice(0, 8).toUpperCase()}`,
        phone: phone.trim(),
        address: address.trim(),
        totalPrice: Number(data.totalPrice || totalPrice),
      });
    } catch {
      setError("Network connection issue. Please check your internet and retry.");
    } finally {
      setLoading(false);
    }
  };

  const handleCopyId = () => {
    if (orderResult) {
      navigator.clipboard.writeText(orderResult.orderCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleTrack = () => {
    if (orderResult) {
      router.push(`/track/${orderResult.id}`);
    }
  };

  const handleReset = () => {
    setOrderResult(null);
    setPhone("");
    setAddress("");
    setName("");
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 select-none">
      {/* Dimmed backdrop */}
      <div
        onClick={() => !loading && handleReset()}
        className="absolute inset-0 bg-black/60 backdrop-blur-xs transition-opacity"
      />

      {/* Modal Dialog */}
      <div className="relative bg-white border border-[#E2E8F0] rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden text-[#0F172A] z-10 animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="px-6 py-4 border-b border-[#E2E8F0] flex items-center justify-between bg-[#F8FAFC]">
          <div>
            <h2 className="text-base font-extrabold text-[#0F172A]">
              {orderResult ? "Order Confirmed!" : "Complete Your 3D Print Order"}
            </h2>
            <p className="text-xs text-[#64748B] mt-0.5">
              {orderResult
                ? "Your custom fabrication order is now in the print queue."
                : "Enter your phone number & address to generate your order."}
            </p>
          </div>
          <button
            type="button"
            onClick={handleReset}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-[#64748B] hover:text-[#0F172A] hover:bg-[#E2E8F0] transition-colors cursor-pointer"
          >
            <FontAwesomeIcon icon={faXmark} className="text-sm" />
          </button>
        </div>

        {orderResult ? (
          /* ── SUCCESS VIEW: SHOW ORDER ID & DETAILS ── */
          <div className="p-6 space-y-5">
            <div className="w-14 h-14 rounded-full bg-[#059669]/10 text-[#059669] flex items-center justify-center mx-auto text-2xl font-bold shadow-xs">
              <FontAwesomeIcon icon={faCheck} />
            </div>

            <div className="text-center space-y-1">
              <span className="text-[11px] font-bold text-[#64748B] uppercase tracking-wider">
                Your Official Tracking ID
              </span>
              <div className="flex items-center justify-center gap-2">
                <span className="text-2xl font-black font-mono text-[#0F172A] tracking-tight bg-[#F1F5F9] px-4 py-1.5 rounded-xl border border-[#CBD5E1]">
                  #{orderResult.orderCode}
                </span>
                <button
                  type="button"
                  onClick={handleCopyId}
                  title="Copy Order ID"
                  className="px-2.5 py-2 rounded-lg bg-white border border-[#CBD5E1] hover:bg-[#F8FAFC] text-xs font-semibold text-[#0F172A] transition-colors inline-flex items-center gap-1.5 cursor-pointer"
                >
                  <FontAwesomeIcon icon={copied ? faCheck : faCopy} className="text-xs" />
                  <span>{copied ? "Copied!" : "Copy"}</span>
                </button>
              </div>
            </div>

            {/* Summary details */}
            <div className="bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl p-4 text-xs space-y-2.5">
              <div className="flex justify-between items-center pb-2 border-b border-[#E2E8F0]">
                <span className="text-[#64748B]">Item Ordered:</span>
                <span className="font-bold text-[#0F172A]">
                  &quot;{customText}&quot; ({selectedStyle?.name ?? "Custom Key"}) × {quantity}
                </span>
              </div>
              <div className="flex justify-between items-center pb-2 border-b border-[#E2E8F0]">
                <span className="text-[#64748B]">Contact Phone:</span>
                <span className="font-bold text-[#0F172A] font-mono">{orderResult.phone}</span>
              </div>
              <div className="flex justify-between items-start pb-2 border-b border-[#E2E8F0]">
                <span className="text-[#64748B] shrink-0">Delivery Address:</span>
                <span className="font-medium text-[#0F172A] text-right pl-4">
                  {orderResult.address}
                </span>
              </div>
              <div className="flex justify-between items-center pt-1 font-bold text-sm">
                <span>Total Amount Payable (COD):</span>
                <span className="font-mono text-[#059669]">৳{orderResult.totalPrice.toFixed(2)}</span>
              </div>
            </div>

            <p className="text-[11px] text-[#64748B] text-center leading-relaxed">
              We will contact you via phone/SMS at <strong className="text-[#0F172A]">{orderResult.phone}</strong> before dispatching your package.
            </p>

            <div className="grid grid-cols-2 gap-3 pt-2">
              <button
                type="button"
                onClick={handleTrack}
                className="h-11 rounded-xl bg-[#0F172A] hover:bg-[#020617] text-white font-semibold text-xs transition-colors flex items-center justify-center gap-2 shadow-sm cursor-pointer"
              >
                <span>Track Order Pipeline</span>
                <FontAwesomeIcon icon={faArrowRight} className="text-xs" />
              </button>
              <button
                type="button"
                onClick={handleReset}
                className="h-11 rounded-xl bg-white border border-[#CBD5E1] hover:bg-[#F8FAFC] text-[#0F172A] font-semibold text-xs transition-colors cursor-pointer"
              >
                Back to Studio
              </button>
            </div>
          </div>
        ) : (
          /* ── ORDER INPUT FORM ── */
          <form onSubmit={handleSubmit} className="p-6 space-y-4">
            {/* Visual Specs Snippet */}
            <div className="p-3 bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl flex items-center justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                {/* Two-tone mini preview */}
                <div
                  className="w-9 h-9 rounded-lg border border-black/15 relative overflow-hidden shrink-0 shadow-2xs"
                  style={{ backgroundColor: selectedBaseColor?.hexCode ?? "#111111" }}
                >
                  <div
                    className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-4 h-4 rounded-full border border-black/20"
                    style={{ backgroundColor: selectedTextColor?.hexCode ?? "#FF6600" }}
                  />
                </div>
                <div className="min-w-0">
                  <div className="text-sm font-bold text-[#0F172A] truncate">
                    &quot;{customText}&quot;
                  </div>
                  <div className="text-[11px] text-[#64748B] truncate">
                    {selectedTextColor?.name} text on {selectedBaseColor?.name} plate
                  </div>
                </div>
              </div>

              {/* Quantity Selector */}
              <div className="flex items-center gap-2 shrink-0 bg-white border border-[#E2E8F0] rounded-lg p-1">
                <button
                  type="button"
                  onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                  className="w-6 h-6 rounded flex items-center justify-center font-bold text-xs hover:bg-[#F1F5F9] cursor-pointer"
                >
                  <FontAwesomeIcon icon={faMinus} className="text-[10px]" />
                </button>
                <span className="text-xs font-bold font-mono px-1">{quantity}</span>
                <button
                  type="button"
                  onClick={() => setQuantity((q) => Math.min(20, q + 1))}
                  className="w-6 h-6 rounded flex items-center justify-center font-bold text-xs hover:bg-[#F1F5F9] cursor-pointer"
                >
                  <FontAwesomeIcon icon={faPlus} className="text-[10px]" />
                </button>
              </div>
            </div>

            {/* Phone Number Field */}
            <div className="space-y-1">
              <label className="text-xs font-bold text-[#0F172A] uppercase tracking-wider flex items-center justify-between">
                <span>Phone Number *</span>
                <span className="text-[10px] text-[#059669] font-normal lowercase">Required for delivery</span>
              </label>
              <input
                type="tel"
                required
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="e.g. 01700-000000 / 01800-000000"
                className="w-full h-11 px-3.5 rounded-xl border border-[#CBD5E1] bg-white text-base sm:text-sm text-[#0F172A] font-medium placeholder:text-[#94A3B8] focus:outline-none focus:border-[#0F172A] focus:ring-2 focus:ring-[#0F172A]/10 transition-all font-mono"
              />
            </div>

            {/* Delivery Address Field */}
            <div className="space-y-1">
              <label className="text-xs font-bold text-[#0F172A] uppercase tracking-wider flex items-center justify-between">
                <span>Full Delivery Address *</span>
                <span className="text-[10px] text-[#64748B] font-normal lowercase">Home / Office</span>
              </label>
              <textarea
                required
                rows={2}
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="House #, Road #, Area, City (e.g. House 14, Road 5, Dhanmondi, Dhaka)"
                className="w-full p-3 rounded-xl border border-[#CBD5E1] bg-white text-base sm:text-sm text-[#0F172A] font-medium placeholder:text-[#94A3B8] focus:outline-none focus:border-[#0F172A] focus:ring-2 focus:ring-[#0F172A]/10 transition-all resize-none"
              />
            </div>

            {/* Customer Name (Optional) */}
            <div className="space-y-1">
              <label className="text-xs font-bold text-[#0F172A] uppercase tracking-wider">
                Recipient Name <span className="text-[#94A3B8] font-normal">(Optional)</span>
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Your name or recipient name"
                className="w-full h-10 px-3.5 rounded-xl border border-[#CBD5E1] bg-white text-base sm:text-sm text-[#0F172A] font-medium placeholder:text-[#94A3B8] focus:outline-none focus:border-[#0F172A] focus:ring-2 focus:ring-[#0F172A]/10 transition-all"
              />
            </div>

            {/* Total price & Cash on Delivery note */}
            <div className="pt-2 border-t border-[#E2E8F0] flex items-center justify-between">
              <div>
                <div className="text-base font-extrabold text-[#0F172A] font-mono leading-tight">
                  ৳{totalPrice.toFixed(2)}
                </div>
                <span className="text-[10px] text-[#059669] font-medium inline-flex items-center gap-1">
                  <FontAwesomeIcon icon={faCheck} className="text-[9px]" />
                  <span>Cash on Delivery Available</span>
                </span>
              </div>

              <div className="text-[11px] text-[#64748B] font-medium text-right">
                Includes split ring & jump ring
              </div>
            </div>

            {error && (
              <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-xs font-semibold text-red-600">
                {error}
              </div>
            )}

            {/* Submit Action */}
            <button
              type="submit"
              disabled={loading || !phone.trim() || !address.trim()}
              className="w-full h-12 rounded-xl bg-[#0F172A] hover:bg-[#020617] disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold text-sm transition-all shadow-md active:scale-[0.99] flex items-center justify-center gap-2 cursor-pointer"
            >
              {loading ? (
                <span>Generating Order ID…</span>
              ) : (
                <>
                  <span>Confirm Order (৳{totalPrice.toFixed(2)})</span>
                  <FontAwesomeIcon icon={faArrowRight} className="text-xs" />
                </>
              )}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
