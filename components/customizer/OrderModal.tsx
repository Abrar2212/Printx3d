"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faCheck,
  faXmark,
  faCopy,
  faArrowRight,
  faPlus,
  faMinus,
  faSpinner,
  faCircleExclamation,
} from "@fortawesome/free-solid-svg-icons";
import type { Style, FilamentColor } from "@/types";
import { oneLine } from "@/lib/keychain-text";

interface OrderModalProps {
  isOpen: boolean;
  onClose: () => void;
  customText: string;
  selectedStyle: Style | null;
  selectedTextColor: FilamentColor | null;
  selectedBaseColor: FilamentColor | null;
  selectedFontStyle: string;
}

const fieldClass =
  "w-full px-4 rounded-xl border border-border-subtle bg-surface text-base text-primary-navy placeholder:text-muted focus:outline-none focus:border-primary-navy focus:ring-4 focus:ring-primary-navy/10 transition-colors";

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
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [quantity, setQuantity] = useState(1);
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [orderResult, setOrderResult] = useState<{
    id: string;
    orderCode: string;
    phone: string;
    address: string;
    totalPrice: number;
  } | null>(null);
  const [copied, setCopied] = useState(false);

  // Native <dialog>: focus trap, Esc to close and the backdrop come from the browser.
  useEffect(() => {
    if (isOpen) dialogRef.current?.showModal();
  }, [isOpen]);

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
      setError("Network problem. Check your internet and try again.");
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

  const handleReset = () => {
    setOrderResult(null);
    setPhone("");
    setAddress("");
    setName("");
    setError(null);
    onClose();
  };

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby="order-title"
      onCancel={(e) => {
        e.preventDefault(); // Esc: close through our own reset, never mid-submit
        if (!loading) handleReset();
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget && !loading) handleReset(); // click on the backdrop
      }}
      className="m-auto w-[calc(100%-2rem)] max-w-md rounded-3xl bg-surface text-primary-navy p-0 shadow-2xl backdrop:bg-primary-navy/50 backdrop:backdrop-blur-sm"
    >
      <div className="p-6 sm:p-7">
        <div className="flex items-start justify-between gap-4 mb-6">
          <h2 id="order-title" className="text-xl font-bold">
            {orderResult ? "Order placed" : "Where should we deliver?"}
          </h2>
          <button
            type="button"
            onClick={handleReset}
            disabled={loading}
            aria-label="Close"
            className="-mr-2 -mt-1 w-11 h-11 rounded-lg flex items-center justify-center text-secondary-slate hover:text-primary-navy hover:bg-surface-muted transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-navy/30"
          >
            <FontAwesomeIcon icon={faXmark} />
          </button>
        </div>

        {orderResult ? (
          <div className="space-y-6">
            <div className="text-center space-y-3">
              <div className="w-14 h-14 rounded-full bg-success/15 text-tertiary-sage flex items-center justify-center mx-auto text-xl">
                <FontAwesomeIcon icon={faCheck} />
              </div>
              <p className="text-sm text-secondary-slate">Your order code</p>
              <div className="flex items-center justify-center gap-2">
                <span className="text-2xl font-bold font-mono tracking-tight">{orderResult.orderCode}</span>
                <button
                  type="button"
                  onClick={handleCopyId}
                  className="h-9 px-3 rounded-lg border border-border hover:bg-bg text-sm font-medium inline-flex items-center gap-1.5 cursor-pointer"
                >
                  <FontAwesomeIcon icon={copied ? faCheck : faCopy} className="text-xs" />
                  {copied ? "Copied" : "Copy"}
                </button>
              </div>
              <p className="text-sm text-secondary-slate" aria-live="polite">
                Save this code to track your order. We&apos;ll call <strong className="text-primary-navy">{orderResult.phone}</strong> before delivery.
              </p>
            </div>

            <dl className="text-sm divide-y divide-border border-y border-border">
              <div className="flex justify-between gap-4 py-3">
                <dt className="text-secondary-slate">Item</dt>
                <dd className="font-medium text-right">
                  &ldquo;{oneLine(customText)}&rdquo; × {quantity}
                </dd>
              </div>
              <div className="flex justify-between gap-4 py-3">
                <dt className="text-secondary-slate">Pay on delivery</dt>
                <dd className="font-semibold">৳{orderResult.totalPrice.toFixed(2)}</dd>
              </div>
            </dl>

            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={handleReset}
                className="h-12 rounded-full border border-border-subtle hover:bg-cream font-bold text-sm transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary-navy/20"
              >
                Done
              </button>
              <button
                type="button"
                onClick={() => router.push(`/track/${orderResult.id}`)}
                className="h-12 rounded-full bg-brand hover:bg-brand-hover text-white font-bold text-sm transition-colors flex items-center justify-center gap-2 cursor-pointer focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-brand/30"
              >
                Track order
                <FontAwesomeIcon icon={faArrowRight} className="text-xs" />
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-5" noValidate>
            {/* What they're ordering */}
            <div className="flex items-center justify-between gap-3 p-3 rounded-xl bg-bg">
              <div className="flex items-center gap-3 min-w-0">
                <span
                  aria-hidden
                  className="w-10 h-10 rounded-full shrink-0 flex items-center justify-center border border-black/10"
                  style={{ backgroundColor: selectedBaseColor?.hexCode ?? "#111111" }}
                >
                  <span
                    className="w-4 h-4 rounded-full border border-black/10"
                    style={{ backgroundColor: selectedTextColor?.hexCode ?? "#FF6600" }}
                  />
                </span>
                <div className="min-w-0">
                  <div className="font-semibold truncate">&ldquo;{oneLine(customText)}&rdquo;</div>
                  <div className="text-xs text-secondary-slate truncate">
                    {selectedTextColor?.name} on {selectedBaseColor?.name}
                  </div>
                </div>
              </div>

              <div role="group" aria-label="Quantity" className="flex items-center shrink-0 rounded-lg border border-border bg-surface">
                <button
                  type="button"
                  onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                  disabled={quantity <= 1}
                  aria-label="Decrease quantity"
                  className="w-10 h-10 flex items-center justify-center disabled:opacity-30 cursor-pointer"
                >
                  <FontAwesomeIcon icon={faMinus} className="text-xs" />
                </button>
                <span className="w-6 text-center text-sm font-semibold tabular-nums" aria-live="polite">
                  {quantity}
                </span>
                <button
                  type="button"
                  onClick={() => setQuantity((q) => Math.min(20, q + 1))}
                  disabled={quantity >= 20}
                  aria-label="Increase quantity"
                  className="w-10 h-10 flex items-center justify-center disabled:opacity-30 cursor-pointer"
                >
                  <FontAwesomeIcon icon={faPlus} className="text-xs" />
                </button>
              </div>
            </div>

            <div className="space-y-2">
              <label htmlFor="order-phone" className="block text-sm font-semibold">
                Phone number
              </label>
              <input
                id="order-phone"
                type="tel"
                inputMode="tel"
                autoComplete="tel"
                required
                autoFocus
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="01700-000000"
                className={`${fieldClass} h-12`}
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="order-address" className="block text-sm font-semibold">
                Delivery address
              </label>
              <textarea
                id="order-address"
                required
                rows={2}
                autoComplete="street-address"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="House, road, area, city"
                className={`${fieldClass} py-3 resize-none`}
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="order-name" className="block text-sm font-semibold">
                Name <span className="font-normal text-secondary-slate">(optional)</span>
              </label>
              <input
                id="order-name"
                type="text"
                autoComplete="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className={`${fieldClass} h-12`}
              />
            </div>

            {error && (
              <p role="alert" className="text-sm font-medium text-error-ink flex items-start gap-2">
                <FontAwesomeIcon icon={faCircleExclamation} className="mt-0.5" />
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={loading || !phone.trim() || !address.trim()}
              className="w-full h-13 rounded-full bg-brand hover:bg-brand-hover disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold text-base transition-colors flex items-center justify-center gap-2 cursor-pointer focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-brand/30"
            >
              {loading ? (
                <>
                  <FontAwesomeIcon icon={faSpinner} spin />
                  Placing order…
                </>
              ) : (
                <>Place order · ৳{totalPrice.toFixed(2)}</>
              )}
            </button>
            <p className="text-xs text-center text-secondary-slate">Cash on delivery. Keyring included.</p>
          </form>
        )}
      </div>
    </dialog>
  );
}
