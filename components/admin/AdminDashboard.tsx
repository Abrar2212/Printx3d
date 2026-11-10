"use client";

import { useState, useEffect, useMemo } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faPrint,
  faLock,
  faPhone,
  faEnvelope,
  faMagnifyingGlass,
  faBox,
  faRotate,
  faDownload,
  faLocationDot,
  faCheck,
  faArrowRight,
  faXmark,
  faCube,
  faPlay,
  faTruckFast,
  faCircleCheck,
} from "@fortawesome/free-solid-svg-icons";
import { faWhatsapp } from "@fortawesome/free-brands-svg-icons";

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
      fullText.includes("Hydration failed") ||
      fullText.includes("A tree hydrated but some attributes") ||
      fullText.includes("did not match. Server:") ||
      fullText.includes("Text content did not match")
    ) {
      return;
    }
    origError(...args);
  };
}

type OrderStatus =
  | "PENDING"
  | "CONFIRMED"
  | "PRINTING"
  | "PRINTED"
  | "SHIPPED"
  | "DELIVERED";

type PaymentStatus = "PENDING" | "PAID" | "FAILED";

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
  paymentStatus: PaymentStatus;
  customerName: string;
  customerEmail: string;
  customerPhone: string | null;
  shippingAddress: string;
  totalPrice: number;
  createdAt: string;
  orderItems: OrderItem[];
}

interface Props {
  orders: Order[];
}

const DEFAULT_PIN = "1234";

const STATUS_CHIPS: Record<
  OrderStatus,
  { bg: string; text: string; border: string; label: string }
> = {
  PENDING: {
    bg: "bg-[#FEF08A]/30",
    text: "text-[#854D0E]",
    border: "border-[#FEF08A]",
    label: "Pending",
  },
  CONFIRMED: {
    bg: "bg-[#E0F2FE]",
    text: "text-[#0369A1]",
    border: "border-[#BAE6FD]",
    label: "Confirmed (Ready to Slice)",
  },
  PRINTING: {
    bg: "bg-[#FEF3C7]",
    text: "text-[#B45309]",
    border: "border-[#FDE68A]",
    label: "Printing on Bed",
  },
  PRINTED: {
    bg: "bg-[#EDE9FE]",
    text: "text-[#6D28D9]",
    border: "border-[#DDD6FE]",
    label: "Printed & Inspected",
  },
  SHIPPED: {
    bg: "bg-[#E0E7FF]",
    text: "text-[#4338CA]",
    border: "border-[#C7D2FE]",
    label: "Handed to Courier",
  },
  DELIVERED: {
    bg: "bg-[#DCFCE7]",
    text: "text-[#15803D]",
    border: "border-[#BBF7D0]",
    label: "Fulfilled & Delivered",
  },
};

const ALL_STATUSES: OrderStatus[] = [
  "PENDING",
  "CONFIRMED",
  "PRINTING",
  "PRINTED",
  "SHIPPED",
  "DELIVERED",
];

export default function AdminDashboard({ orders: initialOrders }: Props) {
  const [orders, setOrders] = useState<Order[]>(initialOrders);
  const [filter, setFilter] = useState<OrderStatus | "ALL">("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [updating, setUpdating] = useState<string | null>(null);
  const [downloadingStl, setDownloadingStl] = useState<string | null>(null);

  // Operator PIN Gate state
  const [hasMounted, setHasMounted] = useState(false);
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [pinInput, setPinInput] = useState("");
  const [pinError, setPinError] = useState("");

  // Printable Job Ticket Modal state
  const [selectedTicketOrder, setSelectedTicketOrder] = useState<Order | null>(null);

  // Check operator authentication session after client mount
  useEffect(() => {
    setHasMounted(true);
    if (typeof window !== "undefined") {
      const stored = sessionStorage.getItem("printx3d_operator_token");
      if (stored === "unlocked") {
        setIsUnlocked(true);
      }
    }
  }, []);

  const handleUnlock = (e: React.FormEvent) => {
    e.preventDefault();
    if (pinInput.trim() === DEFAULT_PIN) {
      if (typeof window !== "undefined") {
        sessionStorage.setItem("printx3d_operator_token", "unlocked");
      }
      setIsUnlocked(true);
      setPinError("");
    } else {
      setPinError("Invalid Operator PIN. Please verify credentials.");
    }
  };

  const handleLock = () => {
    if (typeof window !== "undefined") {
      sessionStorage.removeItem("printx3d_operator_token");
    }
    setIsUnlocked(false);
    setPinInput("");
  };

  // Status Counts
  const counts = orders.reduce(
    (acc, o) => ({ ...acc, [o.status]: (acc[o.status] ?? 0) + 1 }),
    {} as Record<string, number>
  );

  // Search & Filter
  const filtered = useMemo(() => {
    return orders.filter((order) => {
      if (filter !== "ALL" && order.status !== filter) return false;

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const shortId = order.id.slice(0, 8).toLowerCase();
        const fullId = order.id.toLowerCase();
        const name = order.customerName.toLowerCase();
        const phone = (order.customerPhone || "").toLowerCase();
        const textItems = order.orderItems
          .map((i) => i.customText.toLowerCase())
          .join(" ");

        return (
          shortId.includes(q) ||
          fullId.includes(q) ||
          name.includes(q) ||
          phone.includes(q) ||
          textItems.includes(q)
        );
      }
      return true;
    });
  }, [orders, filter, searchQuery]);

  // Update order status via API
  const updateStatus = async (orderId: string, status: OrderStatus) => {
    setUpdating(orderId);
    try {
      const res = await fetch(`/api/orders/${orderId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (res.ok) {
        setOrders((prev) =>
          prev.map((o) => (o.id === orderId ? { ...o, status } : o))
        );
        if (selectedTicketOrder?.id === orderId) {
          setSelectedTicketOrder((prev) => (prev ? { ...prev, status } : null));
        }
      }
    } catch (err) {
      console.error("Failed to update status:", err);
    } finally {
      setUpdating(null);
    }
  };

  // Download STL file directly
  const handleDownloadStl = async (order: Order, itemIndex = 0) => {
    const item = order.orderItems[itemIndex];
    if (!item) return;

    setDownloadingStl(`${order.id}-${itemIndex}`);
    try {
      const response = await fetch(`/api/orders/${order.id}/stl?item=${itemIndex}`);
      if (!response.ok) throw new Error("STL generation failed");

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      const safeText = item.customText.replace(/[^a-zA-Z0-9_-]/g, "_");
      a.download = `PrintX3D_${safeText}_PX-${order.id.slice(0, 8).toUpperCase()}.stl`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err) {
      alert("Error generating 3D STL file. Please check console or server logs.");
      console.error(err);
    } finally {
      setDownloadingStl(null);
    }
  };

  // Helper for workflow advance button
  const renderNextActionButton = (order: Order) => {
    switch (order.status) {
      case "PENDING":
        return (
          <button
            disabled={updating === order.id}
            onClick={() => updateStatus(order.id, "CONFIRMED")}
            className="h-8 px-3.5 bg-[#0F172A] hover:bg-[#020617] disabled:opacity-40 text-white rounded-lg text-xs font-semibold transition-all shadow-xs flex items-center gap-1.5 cursor-pointer"
          >
            <FontAwesomeIcon icon={faCheck} className="text-[11px]" />
            <span>Confirm Order</span>
          </button>
        );
      case "CONFIRMED":
        return (
          <button
            disabled={updating === order.id}
            onClick={() => updateStatus(order.id, "PRINTING")}
            className="h-8 px-3.5 bg-[#059669] hover:bg-[#047857] disabled:opacity-40 text-white rounded-lg text-xs font-semibold transition-all shadow-xs flex items-center gap-1.5 cursor-pointer"
          >
            <FontAwesomeIcon icon={faPlay} className="text-[10px]" />
            <span>Start Print</span>
          </button>
        );
      case "PRINTING":
        return (
          <button
            disabled={updating === order.id}
            onClick={() => updateStatus(order.id, "PRINTED")}
            className="h-8 px-3.5 bg-[#6D28D9] hover:bg-[#5B21B6] disabled:opacity-40 text-white rounded-lg text-xs font-semibold transition-all shadow-xs flex items-center gap-1.5 cursor-pointer"
          >
            <FontAwesomeIcon icon={faCircleCheck} className="text-[11px]" />
            <span>Mark Printed</span>
          </button>
        );
      case "PRINTED":
        return (
          <button
            disabled={updating === order.id}
            onClick={() => updateStatus(order.id, "SHIPPED")}
            className="h-8 px-3.5 bg-[#4338CA] hover:bg-[#3730A3] disabled:opacity-40 text-white rounded-lg text-xs font-semibold transition-all shadow-xs flex items-center gap-1.5 cursor-pointer"
          >
            <FontAwesomeIcon icon={faTruckFast} className="text-[11px]" />
            <span>Mark Shipped</span>
          </button>
        );
      case "SHIPPED":
        return (
          <button
            disabled={updating === order.id}
            onClick={() => updateStatus(order.id, "DELIVERED")}
            className="h-8 px-3.5 bg-[#15803D] hover:bg-[#166534] disabled:opacity-40 text-white rounded-lg text-xs font-semibold transition-all shadow-xs flex items-center gap-1.5 cursor-pointer"
          >
            <FontAwesomeIcon icon={faCircleCheck} className="text-[11px]" />
            <span>Mark Delivered</span>
          </button>
        );
      case "DELIVERED":
        return (
          <span className="text-[#059669] text-xs font-bold uppercase tracking-wider bg-[#DCFCE7] px-2.5 py-1 rounded inline-flex items-center gap-1">
            <FontAwesomeIcon icon={faCheck} className="text-[10px]" />
            <span>Fulfilled</span>
          </span>
        );
      default:
        return null;
    }
  };

  // ─────────────────────────────────────────────────────────────
  // OPERATOR PASSCODE GATE (Blocks public & customer access)
  // ─────────────────────────────────────────────────────────────
  if (!hasMounted || !isUnlocked) {
    return (
      <div suppressHydrationWarning className="min-h-screen bg-[#0F172A] text-white flex items-center justify-center p-4">
        <div suppressHydrationWarning className="w-full max-w-md bg-[#1E293B] border border-[#334155] rounded-xl p-8 shadow-2xl text-center space-y-6">
          <div className="w-14 h-14 rounded-2xl bg-[#059669]/10 border border-[#059669]/30 text-[#10B981] flex items-center justify-center mx-auto text-xl">
            <FontAwesomeIcon icon={faCube} />
          </div>

          <div>
            <span className="inline-block px-2.5 py-0.5 rounded-full text-[11px] font-mono font-semibold uppercase tracking-wider bg-[#334155] text-[#94A3B8] mb-2">
              Operator & Slicer Terminal
            </span>
            <h1 className="text-xl font-bold text-white tracking-tight">
              PrintX3D Workshop Center
            </h1>
            <p className="text-xs text-[#94A3B8] mt-1.5 leading-relaxed">
              Restricted physical manufacturing pipeline. Enter your operator PIN to access the 3D print queue and download slicer STLs.
            </p>
          </div>

          <form onSubmit={handleUnlock} className="space-y-4 text-left">
            <div>
              <label className="block text-xs font-semibold text-[#CBD5E1] uppercase tracking-wider mb-1.5">
                Operator Passcode
              </label>
              <input
                type="password"
                maxLength={6}
                autoFocus
                placeholder="Enter PIN (Default: 1234)"
                value={pinInput}
                onChange={(e) => {
                  setPinInput(e.target.value);
                  setPinError("");
                }}
                className="w-full h-11 px-3.5 bg-[#0F172A] border border-[#475569] rounded-lg text-white font-mono text-center tracking-[0.3em] text-lg focus:outline-none focus:border-[#10B981] focus:ring-1 focus:ring-[#10B981] transition-all"
              />
            </div>

            {pinError && (
              <p className="text-xs text-rose-400 bg-rose-950/40 border border-rose-800/40 p-2.5 rounded-lg text-center font-mono">
                {pinError}
              </p>
            )}

            <button
              type="submit"
              className="w-full h-11 bg-[#059669] hover:bg-[#047857] text-white font-semibold rounded-lg text-sm transition-all shadow-md active:scale-[0.99] flex items-center justify-center gap-2 cursor-pointer"
            >
              <span>Unlock Machine Queue</span>
              <FontAwesomeIcon icon={faArrowRight} className="text-xs" />
            </button>
          </form>

          <div className="pt-2 text-[11px] text-[#64748B] flex items-center justify-between border-t border-[#334155]/60">
            <span>Bambu • Prusa • Cura • Orca</span>
            <span className="font-mono">PIN: 1234</span>
          </div>
        </div>
      </div>
    );
  }

  // ─────────────────────────────────────────────────────────────
  // UNLOCKED OPERATOR WORKSHOP CONSOLE (Clean, Focused Layout)
  // ─────────────────────────────────────────────────────────────
  return (
    <div suppressHydrationWarning className="min-h-screen bg-[#F8FAFC] text-[#0F172A] pb-16">
      {/* ── Top Bar ── */}
      <header className="bg-white border-b border-[#E2E8F0] px-6 py-3.5 sticky top-0 z-20 shadow-xs">
        <div className="max-w-6xl mx-auto flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-[#0F172A] flex items-center justify-center text-white font-bold text-sm shadow-xs">
              P
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base font-bold text-[#0F172A] tracking-tight">
                  PrintX3D Fabrication & Slicer Hub
                </h1>
                <span className="px-2 py-0.5 rounded text-[10px] font-mono font-semibold bg-[#DCFCE7] text-[#15803D] border border-[#BBF7D0]">
                  PHYSICAL BED READY
                </span>
              </div>
              <p className="text-xs text-[#64748B]">
                Two-Tone 3D Orders • Direct STL Downloads • Printable Bed Travelers
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => window.location.reload()}
              title="Refresh order queue"
              className="h-8 px-3 rounded-lg text-xs font-semibold text-[#475569] border border-[#E2E8F0] hover:bg-[#F8FAFC] transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <FontAwesomeIcon icon={faRotate} className="text-xs" />
              <span>Refresh</span>
            </button>

            <button
              onClick={handleLock}
              className="h-8 px-3 rounded-lg text-xs font-semibold text-rose-600 border border-rose-200 bg-rose-50/50 hover:bg-rose-100 transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <FontAwesomeIcon icon={faLock} className="text-xs" />
              <span>Lock Station</span>
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-6xl mx-auto p-4 sm:p-6 md:p-8 space-y-6">
        {/* ── Metric Status Row ── */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
          {ALL_STATUSES.map((s) => {
            const isSelected = filter === s;
            const chip = STATUS_CHIPS[s];
            return (
              <button
                key={s}
                onClick={() => setFilter(filter === s ? "ALL" : s)}
                className={`p-3 rounded-lg border text-left transition-all cursor-pointer ${
                  isSelected
                    ? "bg-white border-[#0F172A] ring-2 ring-[#0F172A]/15 shadow-sm"
                    : "bg-white border-[#E2E8F0] hover:border-[#CBD5E1] shadow-xs"
                }`}
              >
                <div className="text-xl font-bold font-mono text-[#0F172A]">
                  {counts[s] ?? 0}
                </div>
                <div className="mt-1">
                  <span
                    className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wider ${chip.bg} ${chip.text}`}
                  >
                    {s}
                  </span>
                </div>
              </button>
            );
          })}
        </div>

        {/* ── Search & Filter Controls ── */}
        <div className="bg-white border border-[#E2E8F0] rounded-xl p-4 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="relative w-full sm:w-80">
            <input
              type="text"
              placeholder="Search by order ID, phone, name, or text…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full h-9 pl-8 pr-3 bg-[#F8FAFC] border border-[#CBD5E1] rounded-lg text-xs text-[#0F172A] placeholder:text-[#94A3B8] focus:bg-white focus:outline-none focus:border-[#0F172A] transition-all"
            />
            <FontAwesomeIcon
              icon={faMagnifyingGlass}
              className="absolute left-2.5 top-2.5 text-xs text-[#94A3B8]"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-2.5 top-2 text-xs text-[#64748B] hover:text-[#0F172A] cursor-pointer"
              >
                <FontAwesomeIcon icon={faXmark} />
              </button>
            )}
          </div>

          <div className="flex items-center gap-3 text-xs text-[#64748B] w-full sm:w-auto justify-between sm:justify-end">
            <span>
              Showing <strong className="text-[#0F172A]">{filtered.length}</strong> of {orders.length} orders
            </span>
            {filter !== "ALL" && (
              <button
                onClick={() => setFilter("ALL")}
                className="text-[#059669] font-semibold hover:underline cursor-pointer"
              >
                Clear status filter
              </button>
            )}
          </div>
        </div>

        {/* ── Orders Fabrication Queue ── */}
        {filtered.length === 0 ? (
          <div className="bg-white border border-[#E2E8F0] rounded-xl p-12 text-center text-[#64748B] text-sm shadow-sm space-y-3">
            <div className="text-3xl text-[#94A3B8]">
              <FontAwesomeIcon icon={faBox} />
            </div>
            <div className="font-semibold text-[#0F172A]">No orders match the current criteria</div>
            <p className="text-xs text-[#94A3B8]">
              Adjust your search keywords or select &quot;ALL&quot; in the status filter above.
            </p>
          </div>
        ) : (
          <div className="space-y-5">
            {filtered.map((order) => {
              const chip = STATUS_CHIPS[order.status];
              const orderCode = `PX-${order.id.slice(0, 8).toUpperCase()}`;

              // Clean phone number for tel: and whatsapp links
              const rawPhone = order.customerPhone || "";
              const cleanDigits = rawPhone.replace(/\D/g, "");
              const waNumber = cleanDigits.startsWith("0")
                ? `880${cleanDigits.slice(1)}`
                : cleanDigits;

              return (
                <div
                  key={order.id}
                  className="bg-white border border-[#E2E8F0] rounded-xl p-5 md:p-6 shadow-sm hover:border-[#CBD5E1] transition-all space-y-5"
                >
                  {/* Card Header: Order Code, Customer Contact & Badges */}
                  <div className="flex flex-wrap items-start justify-between gap-4 border-b border-[#E2E8F0] pb-4">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2.5">
                        <span className="font-mono font-bold text-base bg-[#0F172A] text-white px-2.5 py-0.5 rounded-md">
                          #{orderCode}
                        </span>
                        <span className="font-bold text-base text-[#0F172A]">
                          {order.customerName}
                        </span>
                        <span className="text-xs text-[#64748B]">
                          • {new Date(order.createdAt).toLocaleDateString("en-US", {
                            month: "short",
                            day: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </span>
                      </div>

                      {/* Customer Communication Shortcuts */}
                      <div className="flex flex-wrap items-center gap-3 text-xs text-[#475569] pt-0.5">
                        {order.customerPhone && (
                          <div className="flex items-center gap-2">
                            <span className="font-mono font-semibold text-[#0F172A] inline-flex items-center gap-1.5">
                              <FontAwesomeIcon icon={faPhone} className="text-[11px] text-[#64748B]" />
                              <span>{order.customerPhone}</span>
                            </span>
                            <a
                              href={`tel:${order.customerPhone}`}
                              className="px-2 py-0.5 rounded bg-[#F1F5F9] hover:bg-[#E2E8F0] text-[#0F172A] font-semibold text-[11px] transition-colors"
                            >
                              Call
                            </a>
                            <a
                              href={`https://wa.me/${waNumber}?text=${encodeURIComponent(
                                `Hello ${order.customerName}, this is PrintX3D regarding your 3D custom keychain order #${orderCode}.`
                              )}`}
                              target="_blank"
                              rel="noreferrer"
                              className="px-2 py-0.5 rounded bg-[#DCFCE7] hover:bg-[#BBF7D0] text-[#15803D] font-semibold text-[11px] transition-colors inline-flex items-center gap-1"
                            >
                              <FontAwesomeIcon icon={faWhatsapp} className="text-xs" />
                              <span>WhatsApp</span>
                            </a>
                          </div>
                        )}
                        <span className="text-[#94A3B8]">|</span>
                        <span className="inline-flex items-center gap-1.5">
                          <FontAwesomeIcon icon={faEnvelope} className="text-[11px] text-[#64748B]" />
                          <span>{order.customerEmail}</span>
                        </span>
                      </div>
                    </div>

                    {/* Status Badge & Workflow Advancement */}
                    <div className="flex items-center gap-2.5">
                      <div className="text-right">
                        <span
                          className={`inline-block px-3 py-1 rounded-md text-xs font-semibold uppercase tracking-wider border ${chip.bg} ${chip.text} ${chip.border}`}
                        >
                          {chip.label}
                        </span>
                      </div>

                      {/* Status Manual Dropdown */}
                      <select
                        value={order.status}
                        disabled={updating === order.id}
                        onChange={(e) =>
                          updateStatus(order.id, e.target.value as OrderStatus)
                        }
                        className="h-8 px-2 bg-[#F8FAFC] border border-[#CBD5E1] rounded-lg text-xs font-semibold text-[#0F172A] focus:outline-none focus:border-[#0F172A]"
                      >
                        {ALL_STATUSES.map((st) => (
                          <option key={st} value={st}>
                            {st}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Physical Manufacturing Items List */}
                  <div className="space-y-3">
                    {order.orderItems.map((item, itemIdx) => {
                      const isDownloading =
                        downloadingStl === `${order.id}-${itemIdx}`;
                      const baseColorHex = item.baseColor?.hexCode ?? "#111111";
                      const textColorHex = item.color.hexCode;
                      const baseColorName = item.baseColor?.name ?? "Matte Black";
                      const textColorName = item.color.name;

                      return (
                        <div
                          key={item.id}
                          className="bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-4"
                        >
                          {/* Item Left: Swatch + Text + Font */}
                          <div className="flex items-start sm:items-center gap-4">
                            {/* Two-Tone Visual Preview */}
                            <div className="relative w-12 h-12 rounded-lg border-2 border-[#0F172A] overflow-hidden flex-shrink-0 shadow-sm flex items-center justify-center">
                              <div
                                className="absolute inset-0"
                                style={{ backgroundColor: baseColorHex }}
                              />
                              <div
                                className="absolute w-6 h-6 rounded-full border border-black/20 shadow-xs"
                                style={{ backgroundColor: textColorHex }}
                              />
                            </div>

                            {/* Custom Text and Dimensions */}
                            <div className="space-y-1">
                              <div className="flex items-center gap-2">
                                <span className="font-mono font-bold text-lg text-[#0F172A] tracking-wider">
                                  &quot;{item.customText}&quot;
                                </span>
                                <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-white border border-[#CBD5E1] text-[#475569]">
                                  Qty: {item.quantity}
                                </span>
                              </div>

                              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-[#64748B]">
                                <span>
                                  <strong>Base:</strong> {baseColorName}
                                </span>
                                <span>•</span>
                                <span>
                                  <strong>Top:</strong> {textColorName}
                                </span>
                                <span>•</span>
                                <span className="font-mono text-[11px]">
                                  Font: {item.fontStyle || "helvetiker_bold"}
                                </span>
                              </div>
                            </div>
                          </div>

                          {/* Item Right: Direct Slicer Download Button */}
                          <div className="flex flex-wrap items-center gap-3">
                            <button
                              type="button"
                              disabled={isDownloading}
                              onClick={() => handleDownloadStl(order, itemIdx)}
                              className="h-9 px-4 bg-[#059669] hover:bg-[#047857] disabled:opacity-50 text-white rounded-lg text-xs font-semibold transition-all shadow-xs flex items-center gap-2 cursor-pointer active:scale-95"
                            >
                              <FontAwesomeIcon icon={faDownload} className="text-xs" />
                              <span>
                                {isDownloading ? "Generating STL…" : "Download .STL"}
                              </span>
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Card Footer: Address, Total & Print Slip Trigger */}
                  <div className="flex flex-wrap items-center justify-between gap-3 pt-1 text-xs text-[#64748B] border-t border-[#F1F5F9]">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-[#0F172A] inline-flex items-center gap-1.5">
                        <FontAwesomeIcon icon={faLocationDot} className="text-[#059669]" />
                        <span>Delivery Address:</span>
                      </span>
                      <span className="text-[#334155]">{order.shippingAddress}</span>
                    </div>

                    <div className="flex items-center gap-3 ml-auto">
                      <span className="font-mono text-sm font-bold text-[#0F172A]">
                        ৳{order.totalPrice.toFixed(2)}
                      </span>

                      {/* Printable Ticket / Bed Slip Modal Button */}
                      <button
                        onClick={() => setSelectedTicketOrder(order)}
                        className="h-8 px-3 rounded-lg text-xs font-semibold text-[#0F172A] border border-[#CBD5E1] bg-white hover:bg-[#F8FAFC] transition-all flex items-center gap-1.5 cursor-pointer"
                      >
                        <FontAwesomeIcon icon={faPrint} className="text-xs text-[#64748B]" />
                        <span>Print Bed Ticket</span>
                      </button>

                      {/* Fast Forward Workflow Action */}
                      {renderNextActionButton(order)}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ─────────────────────────────────────────────────────────────
          PRINTABLE JOB TICKET / PACKING SLIP MODAL
      ───────────────────────────────────────────────────────────── */}
      {selectedTicketOrder && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full p-6 text-[#0F172A] space-y-5 border border-[#E2E8F0]">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-[#E2E8F0] pb-3">
              <div>
                <h3 className="font-bold text-base text-[#0F172A]">
                  Print Bed Ticket & Packing Traveler
                </h3>
                <p className="text-xs text-[#64748B]">
                  Attach to 3D printer bed or insert into delivery package
                </p>
              </div>
              <button
                onClick={() => setSelectedTicketOrder(null)}
                className="w-8 h-8 rounded-lg text-[#64748B] hover:text-[#0F172A] hover:bg-[#F1F5F9] flex items-center justify-center text-sm cursor-pointer"
              >
                <FontAwesomeIcon icon={faXmark} />
              </button>
            </div>

            {/* Printable Content Container */}
            <div id="print-bed-ticket" className="border-2 border-dashed border-[#0F172A] p-5 rounded-lg space-y-4 bg-white">
              <div className="flex items-center justify-between border-b border-black/20 pb-3">
                <div>
                  <div className="font-bold text-lg tracking-tight">PRINTX3D FABRICATION TICKET</div>
                  <div className="font-mono text-xs text-black/60">
                    ORDER #PX-{selectedTicketOrder.id.slice(0, 8).toUpperCase()}
                  </div>
                </div>
                <div className="text-right font-mono text-xs">
                  <div>Date: {new Date(selectedTicketOrder.createdAt).toLocaleDateString()}</div>
                  <div className="font-bold uppercase">{selectedTicketOrder.status}</div>
                </div>
              </div>

              {/* Customer Box */}
              <div className="bg-[#F8FAFC] border border-[#E2E8F0] p-3 rounded text-xs space-y-1">
                <div><strong>Customer:</strong> {selectedTicketOrder.customerName}</div>
                <div><strong>Phone:</strong> {selectedTicketOrder.customerPhone || "N/A"}</div>
                <div><strong>Ship To:</strong> {selectedTicketOrder.shippingAddress}</div>
              </div>

              {/* Items & Slicing Table */}
              <div className="space-y-2">
                <div className="text-xs font-bold uppercase tracking-wider text-black/70">
                  3D Print Machine Specifications
                </div>
                {selectedTicketOrder.orderItems.map((item, idx) => (
                  <div key={idx} className="border border-black/20 p-3 rounded text-xs space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="font-mono font-bold text-base">&quot;{item.customText}&quot;</span>
                      <span className="font-mono">Qty: {item.quantity}</span>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-[11px] pt-1 border-t border-black/10">
                      <div>
                        <span className="text-black/60 block">1. Base Filament:</span>
                        <strong>{item.baseColor?.name ?? "Matte Black"} (0.00 – 2.00mm)</strong>
                      </div>
                      <div>
                        <span className="text-black/60 block">2. Text Filament:</span>
                        <strong>{item.color.name} (2.00 – 3.80mm)</strong>
                      </div>
                    </div>
                    <div className="bg-amber-50 border border-amber-200 p-1.5 rounded text-[11px] text-amber-900 font-mono">
                      Filament Swap Command: PAUSE @ Z = 2.00 mm (Layer 11)
                    </div>
                  </div>
                ))}
              </div>

              {/* Signoff footer */}
              <div className="grid grid-cols-2 gap-4 pt-3 border-t border-black/20 text-[10px] font-mono">
                <div>Printed By: ___________________</div>
                <div>QA / Cleaned: _________________</div>
              </div>
            </div>

            {/* Modal Actions */}
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setSelectedTicketOrder(null)}
                className="h-9 px-4 rounded-lg text-xs font-semibold text-[#64748B] hover:bg-[#F1F5F9] cursor-pointer"
              >
                Close
              </button>

              <button
                type="button"
                onClick={() => window.print()}
                className="h-9 px-4 rounded-lg text-xs font-semibold bg-[#0F172A] hover:bg-[#020617] text-white flex items-center gap-1.5 shadow-sm cursor-pointer"
              >
                <FontAwesomeIcon icon={faPrint} className="text-xs" />
                <span>Send to Printer (Slip)</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
