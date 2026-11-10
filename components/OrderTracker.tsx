"use client";

import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faCheck,
  faArrowRight,
  faLocationDot,
  faClock,
  faCircleCheck,
} from "@fortawesome/free-solid-svg-icons";

type OrderStatus =
  | "PENDING"
  | "CONFIRMED"
  | "PRINTING"
  | "PRINTED"
  | "SHIPPED"
  | "DELIVERED";

interface OrderItem {
  id: string;
  customText: string;
  fontStyle?: string;
  quantity: number;
  unitPrice: number;
  style: { name: string };
  color: { name: string; hexCode: string };
  baseColor?: { name: string; hexCode: string } | null;
}

interface Order {
  id: string;
  status: OrderStatus;
  customerName: string;
  shippingAddress: string;
  totalPrice: number;
  createdAt: string;
  orderItems: OrderItem[];
}

interface Props {
  order: Order;
  statusSteps: readonly OrderStatus[];
}

export default function OrderTracker({ order, statusSteps }: Props) {
  const currentIndex = statusSteps.indexOf(order.status);

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-[#0F172A]">
      {/* ── Top Bar ── */}
      <header className="bg-white border-b border-[#E2E8F0] px-6 py-3.5 flex items-center justify-between shadow-xs sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-[#0F172A] flex items-center justify-center text-white font-bold text-sm">
            P
          </div>
          <span className="font-bold text-base text-[#0F172A]">
            Print<span className="text-[#059669]">X3D</span>
          </span>
        </div>
        <a
          href="/"
          className="text-xs font-semibold text-[#64748B] hover:text-[#0F172A] transition-colors"
        >
          ← Return to Studio
        </a>
      </header>

      <div className="max-w-2xl mx-auto p-6 md:p-8 space-y-6">
        <div>
          <span className="text-[11px] font-bold text-[#059669] uppercase tracking-wider bg-[#059669]/10 px-2 py-0.5 rounded">
            Live Fabrication Pipeline
          </span>
          <h1 className="text-2xl font-bold text-[#0F172A] mt-2">
            Order Status & Milestones
          </h1>
          <div className="flex items-center gap-2 mt-1">
            <span className="text-xs font-bold text-[#059669] font-mono bg-[#059669]/10 px-2 py-0.5 rounded">
              Order ID: #PX-{order.id.slice(0, 8).toUpperCase()}
            </span>
            <span className="text-[11px] text-[#94A3B8] font-mono hidden sm:inline">
              ({order.id})
            </span>
          </div>
        </div>

        {/* ── Progression Pipeline ── */}
        <div className="bg-white border border-[#E2E8F0] rounded-xl p-6 space-y-4 shadow-sm">
          <h2 className="text-xs font-bold text-[#0F172A] uppercase tracking-wider border-b border-[#E2E8F0] pb-2">
            Manufacturing Sequence
          </h2>

          <div className="space-y-3 pt-1">
            {statusSteps.map((step, i) => {
              const isPast = i < currentIndex;
              const isCurrent = i === currentIndex;

              return (
                <div key={step} className="flex items-center gap-3.5">
                  <div
                    className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                      isPast
                        ? "bg-[#059669] text-white"
                        : isCurrent
                        ? "bg-[#0F172A] text-white ring-4 ring-[#0F172A]/10 animate-pulse"
                        : "bg-[#F1F5F9] text-[#94A3B8] border border-[#E2E8F0]"
                    }`}
                  >
                    {isPast ? (
                      <FontAwesomeIcon icon={faCheck} className="text-[10px]" />
                    ) : (
                      i + 1
                    )}
                  </div>

                  <div className="flex-1 flex items-center justify-between">
                    <span
                      className={`text-sm ${
                        isCurrent
                          ? "font-bold text-[#0F172A]"
                          : isPast
                          ? "font-semibold text-[#059669]"
                          : "text-[#94A3B8]"
                      }`}
                    >
                      {step}
                    </span>

                    {isCurrent && (
                      <span className="text-[11px] font-semibold text-[#0F172A] bg-[#0F172A]/5 px-2 py-0.5 rounded">
                        Active Stage
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* ── Item Manifest ── */}
        <div className="bg-white border border-[#E2E8F0] rounded-xl p-6 space-y-3.5 shadow-sm">
          <h2 className="text-xs font-bold text-[#0F172A] uppercase tracking-wider border-b border-[#E2E8F0] pb-2">
            Item Specifications
          </h2>
          {order.orderItems.map((item) => (
            <div
              key={item.id}
              className="flex items-center gap-3 bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg p-3 text-sm"
            >
              {/* Dual Color Swatch */}
              <div className="relative w-7 h-7 rounded border border-black/20 overflow-hidden flex-shrink-0 shadow-2xs">
                <div
                  className="absolute inset-0"
                  style={{ backgroundColor: item.baseColor?.hexCode ?? "#111111" }}
                />
                <div
                  className="absolute inset-1 rounded-full border border-black/15"
                  style={{ backgroundColor: item.color.hexCode }}
                />
              </div>

              <div>
                <span className="font-mono font-bold text-[#0F172A] text-base">
                  &quot;{item.customText}&quot;
                </span>
                <span className="text-[11px] text-[#64748B] block">
                  {item.color.name} text on {item.baseColor?.name ?? "Black"} baseplate
                </span>
              </div>

              <span className="ml-auto font-mono text-xs font-bold text-[#0F172A]">
                ৳{(item.unitPrice * item.quantity).toFixed(2)}
              </span>
            </div>
          ))}

          <div className="border-t border-[#E2E8F0] pt-3 flex justify-between items-center text-sm">
            <span className="font-semibold text-[#64748B]">Settled Amount</span>
            <span className="font-mono font-bold text-base text-[#059669]">
              ৳{order.totalPrice.toFixed(2)}
            </span>
          </div>
        </div>

        {/* ── Destination ── */}
        <div className="bg-white border border-[#E2E8F0] rounded-xl p-6 space-y-2.5 text-xs text-[#64748B] shadow-sm">
          <h2 className="text-xs font-bold text-[#0F172A] uppercase tracking-wider border-b border-[#E2E8F0] pb-2 flex items-center gap-1.5">
            <FontAwesomeIcon icon={faLocationDot} className="text-[#059669]" />
            <span>Destination & Tracking Details</span>
          </h2>
          <div>
            <span className="font-semibold text-[#0F172A]">Recipient: </span>
            {order.customerName}
          </div>
          <div>
            <span className="font-semibold text-[#0F172A]">Delivery Route: </span>
            {order.shippingAddress}
          </div>
          <div className="flex items-center gap-1">
            <FontAwesomeIcon icon={faClock} className="text-[10px] text-[#94A3B8]" />
            <span className="font-semibold text-[#0F172A]">Submitted At: </span>
            <span>
              {new Date(order.createdAt).toLocaleString("en-US", {
                dateStyle: "medium",
                timeStyle: "short",
              })}
            </span>
          </div>
        </div>

        {order.status === "DELIVERED" && (
          <div className="bg-[#22C55E]/10 border border-[#22C55E]/20 rounded-xl p-6 text-center space-y-2">
            <div className="text-2xl font-bold text-[#16A34A] flex items-center justify-center gap-2">
              <FontAwesomeIcon icon={faCircleCheck} />
              <span>Fabrication & Delivery Complete</span>
            </div>
            <p className="text-xs text-[#64748B]">
              Your customized two-tone 3D key has reached its destination.
            </p>
            <div className="pt-2">
              <a
                href="/"
                className="inline-flex items-center gap-2 px-4 py-2 bg-[#0F172A] hover:bg-[#020617] text-white rounded-lg text-xs font-semibold transition-all shadow-xs"
              >
                <span>Create Another 3D Key</span>
                <FontAwesomeIcon icon={faArrowRight} className="text-[10px]" />
              </a>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
