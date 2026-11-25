"use client";

import { useState, useEffect, useMemo } from "react";
import dynamic from "next/dynamic";
import Logo from "@/components/Logo";
import { lineLimit } from "@/lib/keychain-text";
import { MATERIALS, MATERIAL_IDS, materialName } from "@/lib/materials";
import { DEFAULT_SIZE, SIZE_SETTINGS, keychainSize, sizeConfig, type KeychainSize } from "@/lib/keychain-geometry";
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
  faPalette,
  faSliders,
  faFont,
  faPlus,
  faTrash,
  faPenToSquare,
  faEye,
  faRuler,
  faTag,
  faLayerGroup,
} from "@fortawesome/free-solid-svg-icons";
import { faWhatsapp } from "@fortawesome/free-brands-svg-icons";
import { FONT_STYLE_OPTIONS } from "@/types";

// Dynamically load 3D Canvas for the Admin Live Test Bench without SSR
const StudioCanvas = dynamic(() => import("@/components/3d/StudioCanvas"), {
  ssr: false,
  loading: () => (
    <div className="h-64 sm:h-80 bg-primary-navy rounded-xl flex items-center justify-center text-slate-400 text-sm font-mono border border-slate-800">
      <div className="flex items-center gap-2">
        <FontAwesomeIcon icon={faRotate} className="animate-spin text-emerald-400" />
        <span>Initializing 3D Vector Engine…</span>
      </div>
    </div>
  ),
});

// Suppress false-positive hydration warnings caused by browser extensions mutating the DOM
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

export type OrderStatus =
  | "PENDING"
  | "CONFIRMED"
  | "PRINTING"
  | "PRINTED"
  | "SHIPPED"
  | "DELIVERED";

export type PaymentStatus = "PENDING" | "PAID" | "FAILED";

export interface OrderItem {
  id: string;
  customText: string;
  fontStyle?: string;
  material?: string | null;
  quantity: number;
  unitPrice: number;
  style: { name: string; config?: Record<string, unknown> };
  color: { name: string; hexCode: string };
  baseColor?: { name: string; hexCode: string } | null;
}

export interface Order {
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

export interface FilamentItem {
  id: string;
  name: string;
  hexCode: string;
  materials: string[];
  inStock: boolean;
}

/** Which materials a filament colour is stocked in; the last tick can't be removed. */
function MaterialChecks({ value, onChange }: { value: string[]; onChange: (materials: string[]) => void }) {
  return (
    <fieldset>
      <legend className="block text-xs font-bold text-primary-navy uppercase tracking-wider mb-1">Stocked in</legend>
      {MATERIALS.map((m) => (
        <label key={m.id} className="flex items-center gap-2 py-1 text-xs font-semibold cursor-pointer">
          <input
            type="checkbox"
            checked={value.includes(m.id)}
            disabled={value.length === 1 && value.includes(m.id)}
            onChange={(e) => onChange(e.target.checked ? [...value, m.id] : value.filter((id) => id !== m.id))}
            className="w-4 h-4 accent-slate-900"
          />
          {m.name}
        </label>
      ))}
    </fieldset>
  );
}

// "3D Sizing" sliders. Sizes are in font units; the STL prints 1 unit as 16 mm.
const SIZE_SLIDERS: { name: keyof KeychainSize; label: string; icon: typeof faRuler }[] = [
  { name: "textSize", label: "Text Size", icon: faFont },
  { name: "textDepth", label: "Text Depth", icon: faLayerGroup },
  { name: "baseDepth", label: "Base Thickness", icon: faLayerGroup },
  { name: "border", label: "Border Around Letters", icon: faRuler },
  { name: "earRadius", label: "Keyring Ear Radius", icon: faRuler },
  { name: "holeRadius", label: "Keyring Hole Diameter", icon: faRuler },
];
function formatSize(name: keyof KeychainSize, v: number): string {
  if (name === "textSize") return `${Math.round((v / DEFAULT_SIZE.textSize) * 100)}%`;
  return `${(v * 16 * (name === "holeRadius" ? 2 : 1)).toFixed(1)} mm`;
}

export interface StyleItem {
  id: string;
  name: string;
  fontFamily: string;
  basePrice: number;
  config: Record<string, unknown>;
  isActive: boolean;
}

interface Props {
  orders: Order[];
  role: "admin" | "staff"; // staff (reception) sees only the order queue
  initialColors?: FilamentItem[];
  initialStyles?: StyleItem[];
}

const STATUS_CHIPS: Record<
  OrderStatus,
  { bg: string; text: string; border: string; label: string; step: number }
> = {
  PENDING: {
    bg: "bg-[#FEF08A]/30",
    text: "text-[#854D0E]",
    border: "border-[#FEF08A]",
    label: "Pending",
    step: 1,
  },
  CONFIRMED: {
    bg: "bg-[#E0F2FE]",
    text: "text-[#0369A1]",
    border: "border-[#BAE6FD]",
    label: "Confirmed",
    step: 2,
  },
  PRINTING: {
    bg: "bg-[#FEF3C7]",
    text: "text-[#B45309]",
    border: "border-[#FDE68A]",
    label: "Printing",
    step: 3,
  },
  PRINTED: {
    bg: "bg-[#EDE9FE]",
    text: "text-[#6D28D9]",
    border: "border-[#DDD6FE]",
    label: "Printed",
    step: 4,
  },
  SHIPPED: {
    bg: "bg-[#E0E7FF]",
    text: "text-[#4338CA]",
    border: "border-[#C7D2FE]",
    label: "Shipped",
    step: 5,
  },
  DELIVERED: {
    bg: "bg-[#DCFCE7]",
    text: "text-[#15803D]",
    border: "border-[#BBF7D0]",
    label: "Delivered",
    step: 6,
  },
};

const ORDER_FLOW_STAGES: OrderStatus[] = [
  "PENDING",
  "CONFIRMED",
  "PRINTING",
  "PRINTED",
  "SHIPPED",
  "DELIVERED",
];

export default function AdminDashboard({
  orders: initialOrders,
  role,
  initialColors = [],
  initialStyles = [],
}: Props) {
  // Navigation tabs: 'orders' | 'filaments' | 'settings' | 'preview'
  const [activeTab, setActiveTab] = useState<"orders" | "filaments" | "settings" | "preview">("orders");

  // Orders State
  const [orders, setOrders] = useState<Order[]>(initialOrders);
  const [filter, setFilter] = useState<OrderStatus | "ALL">("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [updating, setUpdating] = useState<string | null>(null);
  const [downloadingStl, setDownloadingStl] = useState<string | null>(null);
  const [selectedTicketOrder, setSelectedTicketOrder] = useState<Order | null>(null);

  // Filaments State
  const [colors, setColors] = useState<FilamentItem[]>(initialColors);
  const [editingColor, setEditingColor] = useState<FilamentItem | null>(null);
  const [isAddColorModalOpen, setIsAddColorModalOpen] = useState(false);
  const [newColorName, setNewColorName] = useState("");
  const [newColorHex, setNewColorHex] = useState("#FF6600");
  const [newColorMaterials, setNewColorMaterials] = useState<string[]>([...MATERIAL_IDS]);
  const [newColorInStock, setNewColorInStock] = useState(true);
  const [filamentActionLoading, setFilamentActionLoading] = useState(false);

  // 3D Sizing & Typography Settings State
  const [styles, setStyles] = useState<StyleItem[]>(initialStyles);
  const keychainStyle = useMemo(
    () => styles.find((s) => s.id === "style-keychain") || styles[0],
    [styles]
  );
  const initialConfig = (keychainStyle?.config as Record<string, unknown>) || {};

  // The same reader the shop, the STL and the test bench use, so the sliders start from what prints
  const [sizes, setSizes] = useState<KeychainSize>(() => keychainSize(initialConfig));
  const printSizes = keychainSize(sizeConfig(sizes)); // what the sliders will print (ear/hole kept printable)
  const [maxLines, setMaxLines] = useState<number>(lineLimit(initialConfig));
  const [priceDrafts, setPriceDrafts] = useState<Record<string, { pla: string; tpu: string }>>({}); // product id → edited prices
  const [priceSaving, setPriceSaving] = useState<string | null>(null);
  const [defaultFont, setDefaultFont] = useState<string>(keychainStyle?.fontFamily || "helvetiker_bold");
  const [settingsSaving, setSettingsSaving] = useState(false);
  const [settingsToast, setSettingsToast] = useState("");

  // Live 3D Test Bench State
  const [testText, setTestText] = useState("Abrar");
  const [testTextColor, setTestTextColor] = useState("#FF6600");
  const [testBaseColor, setTestBaseColor] = useState("#111111");
  const [testFontStyle, setTestFontStyle] = useState("helvetiker_bold");
  const [testKeychainLoop, setTestKeychainLoop] = useState(true);

  // Access is enforced on the server by proxy.ts; this only decides what to show.
  const isAdmin = role === "admin";
  const [hasMounted, setHasMounted] = useState(false);

  useEffect(() => {
    setHasMounted(true);
    const tabParam = new URLSearchParams(window.location.search).get("tab");
    if (isAdmin && (tabParam === "filaments" || tabParam === "settings" || tabParam === "preview")) {
      setActiveTab(tabParam);
    }
  }, [isAdmin]);

  const handleLogout = async () => {
    await fetch("/api/auth", { method: "DELETE" }).catch(() => {});
    window.location.href = "/login";
  };

  // Status Counts
  const counts = orders.reduce(
    (acc, o) => ({ ...acc, [o.status]: (acc[o.status] ?? 0) + 1 }),
    {} as Record<string, number>
  );

  // Search & Filter
  const filteredOrders = useMemo(() => {
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

  // Advance Order Workflow to next logical stage
  const advanceOrderStage = (order: Order) => {
    const currentIndex = ORDER_FLOW_STAGES.indexOf(order.status);
    if (currentIndex >= 0 && currentIndex < ORDER_FLOW_STAGES.length - 1) {
      const nextStage = ORDER_FLOW_STAGES[currentIndex + 1];
      updateStatus(order.id, nextStage);
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

  // ─── Filament Handlers ──────────────────────────────────────
  const handleToggleColorStock = async (color: FilamentItem) => {
    const nextStock = !color.inStock;
    // Optimistic update
    setColors((prev) =>
      prev.map((c) => (c.id === color.id ? { ...c, inStock: nextStock } : c))
    );
    try {
      await fetch(`/api/admin/filaments/${color.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ inStock: nextStock }),
      });
    } catch (err) {
      console.error("Failed to toggle stock:", err);
      // Revert
      setColors((prev) =>
        prev.map((c) => (c.id === color.id ? { ...c, inStock: color.inStock } : c))
      );
    }
  };

  const handleCreateColor = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newColorName.trim() || !newColorHex) return;
    setFilamentActionLoading(true);
    try {
      const res = await fetch("/api/admin/filaments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newColorName.trim(),
          hexCode: newColorHex,
          materials: newColorMaterials,
          inStock: newColorInStock,
        }),
      });
      if (res.ok) {
        const created = await res.json();
        setColors((prev) => [...prev, created]);
        setIsAddColorModalOpen(false);
        setNewColorName("");
        setNewColorHex("#FF6600");
        setNewColorMaterials([...MATERIAL_IDS]);
      } else {
        alert("Failed to create color. Please check the hex code.");
      }
    } catch (err) {
      console.error("Error creating color:", err);
    } finally {
      setFilamentActionLoading(false);
    }
  };

  const handleUpdateColor = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingColor) return;
    setFilamentActionLoading(true);
    try {
      const res = await fetch(`/api/admin/filaments/${editingColor.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: editingColor.name,
          hexCode: editingColor.hexCode,
          materials: editingColor.materials,
          inStock: editingColor.inStock,
        }),
      });
      if (res.ok) {
        const updated = await res.json();
        setColors((prev) =>
          prev.map((c) => (c.id === updated.id ? updated : c))
        );
        setEditingColor(null);
      }
    } catch (err) {
      console.error("Failed to update color:", err);
    } finally {
      setFilamentActionLoading(false);
    }
  };

  const handleDeleteColor = async (colorId: string) => {
    if (!confirm("Are you sure you want to remove this filament from the spool rack?")) return;
    try {
      const res = await fetch(`/api/admin/filaments/${colorId}`, {
        method: "DELETE",
      });
      if (res.ok) {
        setColors((prev) => prev.filter((c) => c.id !== colorId));
      }
    } catch (err) {
      console.error("Failed to delete color:", err);
    }
  };

  // ─── Product prices: one row per active product (Keychain, Desk Plaque Stand, …) ──
  const handleSavePrice = async (style: StyleItem) => {
    const draft = priceDrafts[style.id];
    if (!draft) return;
    const basePrice = parseFloat(draft.pla);
    const tpuPrice = draft.tpu.trim() === "" ? null : parseFloat(draft.tpu); // empty: same as PLA+
    setPriceSaving(style.id);
    try {
      const res = await fetch(`/api/admin/styles/${style.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ basePrice, config: { tpuPrice } }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const updated = await res.json();
      setStyles((prev) => prev.map((s) => (s.id === updated.id ? { ...s, basePrice: Number(updated.basePrice), config: updated.config } : s)));
      setPriceDrafts(({ [style.id]: _saved, ...rest }) => rest);
      setSettingsToast(`${style.name} prices updated.`);
      setTimeout(() => setSettingsToast(""), 4000);
    } catch (err) {
      console.error("Failed to save price:", err);
      setSettingsToast("");
      alert(`Could not save the price for ${style.name}.`);
    } finally {
      setPriceSaving(null);
    }
  };

  // ─── Settings Handlers ──────────────────────────────────────
  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!keychainStyle) return;
    setSettingsSaving(true);
    setSettingsToast("");
    try {
      const res = await fetch(`/api/admin/styles/${keychainStyle.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fontFamily: defaultFont,
          config: { ...sizeConfig(printSizes), maxLines },
        }),
      });
      if (res.ok) {
        const updated = await res.json();
        setStyles((prev) =>
          prev.map((s) => (s.id === updated.id ? updated : s))
        );
        setSettingsToast("3D Sizing & Typography parameters updated successfully!");
        setTimeout(() => setSettingsToast(""), 4000);
      }
    } catch (err) {
      console.error("Failed to save settings:", err);
      alert("Failed to save 3D settings.");
    } finally {
      setSettingsSaving(false);
    }
  };

  // Client-only render, as before the login change (avoids hydration mismatches in dates etc.)
  if (!hasMounted) return null;

  // ─────────────────────────────────────────────────────────────
  // ADMIN & WORKSHOP PORTAL
  // ─────────────────────────────────────────────────────────────
  return (
    <div suppressHydrationWarning className="min-h-screen bg-bg text-primary-navy pb-16">
      {/* ── Top Header ── */}
      <header className="bg-white border-b border-border px-4 sm:px-6 py-3 sticky top-0 z-30 shadow-xs">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <Logo className="w-24" href={isAdmin ? "/admin" : "/operator"} />
            <h1 className="text-sm font-semibold text-secondary-slate border-l border-border pl-2.5">
              {isAdmin ? "Admin" : "Reception"}
            </h1>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => window.location.reload()}
              title="Refresh"
              className="h-8 px-2.5 rounded-lg text-xs font-semibold text-[#475569] border border-border hover:bg-bg transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <FontAwesomeIcon icon={faRotate} className="text-xs" />
              <span className="hidden sm:inline">Refresh</span>
            </button>

            <button
              onClick={handleLogout}
              className="h-8 px-2.5 rounded-lg text-xs font-semibold text-rose-600 border border-rose-200 bg-rose-50/50 hover:bg-rose-100 transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <FontAwesomeIcon icon={faLock} className="text-xs" />
              <span>Sign out</span>
            </button>
          </div>
        </div>

        {/* ── Primary Navigation Tabs ── */}
        <div className="max-w-7xl mx-auto mt-2.5 border-t border-slate-100 pt-2 flex items-center gap-1 overflow-x-auto">
          <button
            onClick={() => setActiveTab("orders")}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
              activeTab === "orders"
                ? "bg-primary-navy text-white shadow-xs"
                : "text-secondary-slate hover:text-primary-navy hover:bg-slate-100"
            }`}
          >
            <FontAwesomeIcon icon={faBox} className="text-xs" />
            <span>Orders</span>
            <span
              className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono ${
                activeTab === "orders" ? "bg-white/20 text-white" : "bg-slate-200 text-slate-700"
              }`}
            >
              {orders.length}
            </span>
          </button>

          {isAdmin && (<>
          <button
            onClick={() => setActiveTab("filaments")}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
              activeTab === "filaments"
                ? "bg-primary-navy text-white shadow-xs"
                : "text-secondary-slate hover:text-primary-navy hover:bg-slate-100"
            }`}
          >
            <FontAwesomeIcon icon={faPalette} className="text-xs" />
            <span>Filaments</span>
            <span
              className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono ${
                activeTab === "filaments" ? "bg-white/20 text-white" : "bg-slate-200 text-slate-700"
              }`}
            >
              {colors.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab("settings")}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
              activeTab === "settings"
                ? "bg-primary-navy text-white shadow-xs"
                : "text-secondary-slate hover:text-primary-navy hover:bg-slate-100"
            }`}
          >
            <FontAwesomeIcon icon={faSliders} className="text-xs" />
            <span>3D Settings</span>
          </button>

          <button
            onClick={() => setActiveTab("preview")}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
              activeTab === "preview"
                ? "bg-tertiary-sage text-white shadow-xs"
                : "text-tertiary-sage hover:bg-emerald-50"
            }`}
          >
            <FontAwesomeIcon icon={faEye} className="text-xs" />
            <span>Preview</span>
          </button>
          </>)}
        </div>
      </header>

      <div className="max-w-7xl mx-auto p-4 sm:p-6 md:p-8">
        {/* ═══════════════════════════════════════════════════════
            TAB 1: ORDER FLOW PIPELINE & PRODUCTION
        ════════════════════════════════════════════════════════ */}
        {activeTab === "orders" && (
          <div className="space-y-6">
            {/* Metric Status Chips */}
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
              {ORDER_FLOW_STAGES.map((s) => {
                const isSelected = filter === s;
                const chip = STATUS_CHIPS[s];
                return (
                  <button
                    key={s}
                    onClick={() => setFilter(filter === s ? "ALL" : s)}
                    className={`p-3 rounded-lg border text-left transition-all cursor-pointer ${
                      isSelected
                        ? "bg-white border-primary-navy ring-2 ring-primary-navy/15 shadow-sm"
                        : "bg-white border-border hover:border-border-subtle shadow-xs"
                    }`}
                  >
                    <div className="text-xl font-bold font-mono text-primary-navy">
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

            {/* Search & Filter Controls */}
            <div className="bg-white border border-border rounded-xl p-4 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="relative w-full sm:w-80">
                <input
                  type="text"
                  placeholder="Search orders…"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full h-9 pl-9 pr-4 bg-bg border border-border rounded-lg text-xs text-primary-navy placeholder-muted focus:outline-none focus:border-primary-navy transition-all"
                />
                <FontAwesomeIcon
                  icon={faMagnifyingGlass}
                  className="absolute left-3 top-2.5 text-xs text-muted"
                />
              </div>

              <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                <span className="text-xs text-secondary-slate">Showing:</span>
                <span className="text-xs font-bold text-primary-navy font-mono">
                  {filteredOrders.length} {filteredOrders.length === 1 ? "Job" : "Jobs"}
                </span>
                {filter !== "ALL" && (
                  <button
                    onClick={() => setFilter("ALL")}
                    className="text-xs text-tertiary-sage hover:underline font-semibold ml-2 cursor-pointer"
                  >
                    Clear Filter
                  </button>
                )}
              </div>
            </div>

            {/* Order Flow Pipeline List */}
            {filteredOrders.length === 0 ? (
              <div className="bg-white border border-border rounded-xl p-12 text-center shadow-xs">
                <div className="w-12 h-12 rounded-full bg-surface-muted text-muted flex items-center justify-center mx-auto text-lg mb-3">
                  <FontAwesomeIcon icon={faBox} />
                </div>
                <h3 className="text-sm font-bold text-primary-navy">No orders found</h3>
                <p className="text-xs text-secondary-slate mt-1">
                  {filter !== "ALL"
                    ? `No orders matching filter "${filter}"`
                    : "No print orders in the queue."}
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {filteredOrders.map((order) => {
                  const chip = STATUS_CHIPS[order.status];
                  const currentStep = chip.step;

                  return (
                    <div
                      key={order.id}
                      className="bg-white border border-border rounded-xl p-5 shadow-xs hover:border-border-subtle transition-all space-y-4"
                    >
                      {/* Top Row: Customer & Order ID */}
                      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-surface-muted pb-3">
                        <div className="flex items-center gap-3">
                          <span className="text-xs font-mono font-bold bg-primary-navy text-white px-2.5 py-1 rounded">
                            PX-{order.id.slice(0, 8).toUpperCase()}
                          </span>
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-bold text-primary-navy">
                                {order.customerName}
                              </span>
                              <span className="text-xs text-secondary-slate font-mono">
                                • {new Date(order.createdAt).toLocaleDateString()}
                              </span>
                            </div>
                            <div className="flex items-center gap-3 text-xs text-secondary-slate mt-0.5">
                              {order.customerPhone && (
                                <a
                                  href={`tel:${order.customerPhone}`}
                                  className="hover:text-primary-navy flex items-center gap-1"
                                >
                                  <FontAwesomeIcon icon={faPhone} className="text-[10px]" />
                                  <span>{order.customerPhone}</span>
                                </a>
                              )}
                              {order.customerPhone && (
                                <a
                                  href={`https://wa.me/${order.customerPhone.replace(/[^0-9]/g, "")}?text=Hello%20${encodeURIComponent(
                                    order.customerName
                                  )},%20regarding%20your%20PrintX3D%20custom%20order%20PX-${order.id.slice(
                                    0,
                                    8
                                  ).toUpperCase()}:`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-tertiary-sage hover:underline flex items-center gap-1 font-semibold"
                                >
                                  <FontAwesomeIcon icon={faWhatsapp} className="text-xs" />
                                  <span>WhatsApp</span>
                                </a>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Order Total & Status Selector */}
                        <div className="flex items-center gap-3">
                          <div className="text-right">
                            <span className="text-sm font-bold font-mono text-primary-navy">
                              ৳{order.totalPrice.toFixed(2)}
                            </span>
                            <div className="text-[10px] text-secondary-slate uppercase font-mono">
                              {order.paymentStatus === "PAID" ? (
                                <span className="text-emerald-600 font-bold">PAID</span>
                              ) : (
                                <span>Cash / Pending</span>
                              )}
                            </div>
                          </div>

                          <select
                            value={order.status}
                            disabled={updating === order.id}
                            onChange={(e) => updateStatus(order.id, e.target.value as OrderStatus)}
                            className={`text-xs font-bold px-2.5 py-1.5 rounded-lg border cursor-pointer focus:outline-none transition-all ${chip.bg} ${chip.text} ${chip.border}`}
                          >
                            {ORDER_FLOW_STAGES.map((s) => (
                              <option key={s} value={s}>
                                {STATUS_CHIPS[s].label}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>

                      {/* Visual Order Flow Stage Progress Bar */}
                      <div className="bg-bg border border-border/80 rounded-lg p-3">
                        <div className="flex items-center justify-between text-[11px] mb-2">
                          <span className="font-semibold text-primary-navy">{chip.label}</span>
                          <span className="font-mono text-secondary-slate">
                            Step {currentStep} of {ORDER_FLOW_STAGES.length}
                          </span>
                        </div>

                        <div className="grid grid-cols-6 gap-1.5">
                          {ORDER_FLOW_STAGES.map((st, idx) => {
                            const stepNum = idx + 1;
                            const isDone = stepNum < currentStep;
                            const isCurrent = stepNum === currentStep;
                            const stageChip = STATUS_CHIPS[st];

                            return (
                              <div
                                key={st}
                                className={`rounded px-1.5 py-1 text-center border transition-all ${
                                  isCurrent
                                    ? `${stageChip.bg} ${stageChip.border} ring-1 ring-primary-navy/20`
                                    : isDone
                                    ? "bg-emerald-50 border-emerald-200 text-emerald-800"
                                    : "bg-white border-slate-200 text-slate-400"
                                }`}
                              >
                                <div className="text-[10px] font-mono font-bold leading-tight flex items-center justify-center gap-1">
                                  {isDone ? (
                                    <FontAwesomeIcon icon={faCheck} className="text-[9px] text-emerald-600" />
                                  ) : (
                                    <span>{stepNum}.</span>
                                  )}
                                  <span className="truncate">{st}</span>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>

                      {/* Order Items List with Two-Tone Colors */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {order.orderItems.map((item, idx) => {
                          const baseColorHex = item.baseColor?.hexCode || "#111111";
                          const textColorHex = item.color.hexCode;

                          return (
                            <div
                              key={item.id}
                              className="border border-border rounded-lg p-3.5 bg-white flex flex-col justify-between gap-3 shadow-xs"
                            >
                              <div>
                                <div className="flex items-center justify-between gap-2">
                                  <span className="text-[11px] font-mono text-secondary-slate uppercase">
                                    {item.style.name}
                                  </span>
                                  <span className="text-xs font-bold font-mono text-primary-navy">
                                    Qty: {item.quantity} × ৳{item.unitPrice.toFixed(2)}
                                  </span>
                                </div>

                                <div className="text-base font-bold text-primary-navy tracking-tight mt-1 whitespace-pre-line">
                                  {item.customText}
                                </div>
                                <div className="text-xs text-secondary-slate font-mono mt-0.5">
                                  {item.fontStyle || "helvetiker_bold"}
                                  {item.material && ` · ${materialName(item.material)}`}
                                </div>
                              </div>

                              {/* Two-Tone Color Indicator */}
                              <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-xs">
                                <div className="flex items-center gap-2">
                                  {/* Lettering color badge */}
                                  <div className="flex items-center gap-1.5">
                                    <span
                                      className="w-3.5 h-3.5 rounded-full border border-black/20 shadow-xs inline-block"
                                      style={{ backgroundColor: textColorHex }}
                                    />
                                    <span className="font-semibold text-primary-navy">
                                      {item.color.name}
                                    </span>
                                  </div>

                                  <span className="text-slate-400">/</span>

                                  {/* Baseplate color badge */}
                                  <div className="flex items-center gap-1.5">
                                    <span
                                      className="w-3.5 h-3.5 rounded-full border border-black/20 shadow-xs inline-block"
                                      style={{ backgroundColor: baseColorHex }}
                                    />
                                    <span className="text-secondary-slate">
                                      {item.baseColor?.name || "Matte Black"}
                                    </span>
                                  </div>
                                </div>

                                {/* Quick Download STL */}
                                <button
                                  disabled={downloadingStl === `${order.id}-${idx}`}
                                  onClick={() => handleDownloadStl(order, idx)}
                                  className="h-7 px-2.5 rounded bg-slate-100 hover:bg-slate-200 text-primary-navy font-semibold text-[11px] flex items-center gap-1 cursor-pointer transition-all"
                                >
                                  {downloadingStl === `${order.id}-${idx}` ? (
                                    <>
                                      <FontAwesomeIcon icon={faRotate} className="animate-spin text-[10px]" />
                                      <span>Slicing…</span>
                                    </>
                                  ) : (
                                    <>
                                      <FontAwesomeIcon icon={faDownload} className="text-[10px]" />
                                      <span>STL</span>
                                    </>
                                  )}
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>

                      {/* Bottom Action Footer */}
                      <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
                        <div className="flex items-center gap-1 text-xs text-secondary-slate">
                          <FontAwesomeIcon icon={faLocationDot} className="text-[10px]" />
                          <span className="truncate max-w-sm">{order.shippingAddress}</span>
                        </div>

                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => setSelectedTicketOrder(order)}
                            className="h-8 px-3 rounded-lg border border-border-subtle text-primary-navy hover:bg-bg text-xs font-semibold flex items-center gap-1.5 cursor-pointer transition-all"
                          >
                            <FontAwesomeIcon icon={faPrint} className="text-xs" />
                            <span>Ticket</span>
                          </button>

                          {order.status !== "DELIVERED" && (
                            <button
                              disabled={updating === order.id}
                              onClick={() => advanceOrderStage(order)}
                              className="h-8 px-3.5 bg-primary-navy hover:bg-primary-navy-hover text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 cursor-pointer shadow-xs transition-all disabled:opacity-50"
                            >
                              <span>Advance</span>
                              <FontAwesomeIcon icon={faArrowRight} className="text-xs" />
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ═══════════════════════════════════════════════════════
            TAB 2: FILAMENT COLORS & SPOOL INVENTORY
        ════════════════════════════════════════════════════════ */}
        {activeTab === "filaments" && (
          <div className="space-y-6">
            {/* Header with Add Button */}
            <div className="bg-white border border-border rounded-xl p-5 shadow-xs flex flex-wrap items-center justify-between gap-4">
              <div>
                <h2 className="text-sm font-bold text-primary-navy">
                  Filaments
                </h2>
                <p className="text-xs text-secondary-slate">
                  Manage colors and stock status.
                </p>
              </div>

              <button
                onClick={() => setIsAddColorModalOpen(true)}
                className="h-9 px-4 bg-tertiary-sage hover:bg-[#047857] text-white rounded-lg text-xs font-bold flex items-center gap-2 shadow-xs transition-all cursor-pointer"
              >
                <FontAwesomeIcon icon={faPlus} className="text-xs" />
                <span>Add Color</span>
              </button>
            </div>

            {/* Filament Spools Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {colors.map((color) => {
                return (
                  <div
                    key={color.id}
                    className={`bg-white border rounded-xl p-4 shadow-xs transition-all flex flex-col justify-between gap-3 ${
                      color.inStock
                        ? "border-border hover:border-border-subtle"
                        : "border-slate-200 opacity-60 bg-slate-50/70"
                    }`}
                  >
                    <div>
                      {/* Color Preview Swatch */}
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2.5">
                          <div
                            className="w-8 h-8 rounded-full border-2 border-white shadow-md ring-1 ring-black/15 flex-shrink-0"
                            style={{ backgroundColor: color.hexCode }}
                          />
                          <div>
                            <h3 className="text-sm font-bold text-primary-navy leading-tight">
                              {color.name}
                            </h3>
                            <span className="text-[11px] font-mono text-secondary-slate">
                              {color.hexCode}
                            </span>
                          </div>
                        </div>

                        <span className="px-2 py-0.5 rounded text-[10px] font-bold font-mono bg-slate-100 text-slate-700 uppercase">
                          {color.materials.map((m) => (m === "PLA" ? "PLA+" : m)).join(" / ")}
                        </span>
                      </div>
                    </div>

                    {/* Stock Switch and Edit/Delete Controls */}
                    <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                      {/* In-Stock Toggle */}
                      <button
                        type="button"
                        onClick={() => handleToggleColorStock(color)}
                        className={`text-xs font-bold px-2.5 py-1 rounded-md flex items-center gap-1.5 transition-all cursor-pointer ${
                          color.inStock
                            ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                            : "bg-slate-100 text-slate-500 border border-slate-200"
                        }`}
                      >
                        <span
                          className={`w-2 h-2 rounded-full ${
                            color.inStock ? "bg-emerald-500" : "bg-slate-400"
                          }`}
                        />
                        <span>{color.inStock ? "In Stock" : "Out of Stock"}</span>
                      </button>

                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => setEditingColor(color)}
                          className="w-7 h-7 rounded text-slate-500 hover:text-slate-800 hover:bg-slate-100 flex items-center justify-center text-xs transition-all cursor-pointer"
                          title="Edit color"
                        >
                          <FontAwesomeIcon icon={faPenToSquare} />
                        </button>
                        <button
                          onClick={() => handleDeleteColor(color.id)}
                          className="w-7 h-7 rounded text-rose-400 hover:text-rose-600 hover:bg-rose-50 flex items-center justify-center text-xs transition-all cursor-pointer"
                          title="Delete filament"
                        >
                          <FontAwesomeIcon icon={faTrash} />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ═══════════════════════════════════════════════════════
            TAB 3: TYPOGRAPHY, SIZING & 3D PARAMETERS
        ════════════════════════════════════════════════════════ */}
        {activeTab === "settings" && (
          <div className="space-y-6">
            {/* Notification Toast */}
            {settingsToast && (
              <div className="bg-emerald-50 border border-emerald-300 text-emerald-900 p-4 rounded-xl text-xs font-bold flex items-center gap-2">
                <FontAwesomeIcon icon={faCheck} className="text-emerald-600 text-sm" />
                <span>{settingsToast}</span>
              </div>
            )}

            {/* Product prices (outside the settings form: each row saves on its own) */}
            <div className="bg-white border border-border rounded-xl p-6 shadow-xs space-y-4">
              <div>
                <h2 className="text-sm font-bold text-primary-navy">Product Prices</h2>
                <p className="text-xs text-secondary-slate">What customers pay for each product, in ৳. Leave TPU empty to charge the PLA+ price.</p>
              </div>
              <div className="divide-y divide-slate-100">
                {styles
                  .filter((s) => s.isActive)
                  .map((style) => {
                    const saved = { pla: String(style.basePrice), tpu: String(style.config.tpuPrice ?? "") };
                    const draft = priceDrafts[style.id] ?? saved;
                    const changed = draft.pla !== saved.pla || draft.tpu !== saved.tpu;
                    const valid = parseFloat(draft.pla) > 0 && (draft.tpu.trim() === "" || parseFloat(draft.tpu) > 0);
                    return (
                      <div key={style.id} className="flex flex-wrap items-center gap-3 py-3">
                        <span className="flex-1 min-w-40 text-sm font-semibold text-primary-navy">{style.name}</span>
                        {(["pla", "tpu"] as const).map((k) => (
                          <label key={k} className="w-36 text-[11px] font-bold text-secondary-slate">
                            {k === "pla" ? "PLA+ (৳)" : "TPU (৳)"}
                            <input
                              type="number"
                              step="any"
                              min="0"
                              value={draft[k]}
                              placeholder={k === "tpu" ? "Same as PLA+" : undefined}
                              aria-label={`${style.name} ${k === "pla" ? "PLA+" : "TPU"} price`}
                              onChange={(e) => setPriceDrafts((d) => ({ ...d, [style.id]: { ...draft, [k]: e.target.value } }))}
                              className="w-full h-10 px-3 bg-slate-50 border border-slate-200 rounded-lg text-sm font-bold font-mono text-primary-navy focus:bg-white focus:outline-none focus:border-slate-800 transition-all"
                            />
                          </label>
                        ))}
                        <button
                          type="button"
                          onClick={() => handleSavePrice(style)}
                          disabled={!changed || !valid || priceSaving === style.id}
                          className="h-10 px-4 bg-primary-navy hover:bg-primary-navy-hover disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold text-xs rounded-lg transition-all cursor-pointer"
                        >
                          {priceSaving === style.id ? "Saving…" : "Save"}
                        </button>
                      </div>
                    );
                  })}
              </div>
            </div>

            <form onSubmit={handleSaveSettings} className="space-y-6">
              {/* 3D Sizing & Geometry Parameters Card */}
              <div className="bg-white border border-border rounded-xl p-6 shadow-xs space-y-6">
                <div>
                  <h2 className="text-sm font-bold text-primary-navy">
                    3D Geometry
                  </h2>
                  <p className="text-xs text-secondary-slate">
                    Extrusions, scaling, and keychain hole dimensions.
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {/* Lines of customer text */}
                  <div role="radiogroup" aria-labelledby="max-lines-label" className="space-y-1.5">
                    <div className="flex justify-between items-center text-xs">
                      <span id="max-lines-label" className="font-bold text-primary-navy flex items-center gap-1.5">
                        <FontAwesomeIcon icon={faFont} className="text-tertiary-sage" />
                        <span>Lines</span>
                      </span>
                      <span className="font-mono text-emerald-700 font-bold">
                        {maxLines} {maxLines === 1 ? "line" : "lines"}
                      </span>
                    </div>
                    <div className="grid grid-cols-3 gap-1.5">
                      {[1, 2, 3].map((n) => (
                        <button
                          key={n}
                          type="button"
                          role="radio"
                          aria-checked={maxLines === n}
                          onClick={() => setMaxLines(n)}
                          className={`h-9 rounded-lg border text-sm font-semibold transition-colors cursor-pointer ${
                            maxLines === n
                              ? "border-primary-navy bg-primary-navy text-white"
                              : "border-border bg-white text-primary-navy hover:bg-bg"
                          }`}
                        >
                          {n}
                        </button>
                      ))}
                    </div>
                    <p className="text-[11px] text-muted">
                      Customers press Enter for a new line. Max 12 characters per line.
                    </p>
                  </div>

                  {SIZE_SLIDERS.map(({ name, label, icon }) => (
                    <div key={name} className="space-y-1.5">
                      <div className="flex justify-between items-center text-xs">
                        <label htmlFor={`size-${name}`} className="font-bold text-primary-navy flex items-center gap-1.5">
                          <FontAwesomeIcon icon={icon} className="text-tertiary-sage" />
                          <span>{label}</span>
                        </label>
                        <span className="font-mono text-emerald-700 font-bold">{formatSize(name, sizes[name])}</span>
                      </div>
                      <input
                        id={`size-${name}`}
                        type="range"
                        min={SIZE_SETTINGS[name].min}
                        max={SIZE_SETTINGS[name].max}
                        step={0.005}
                        value={sizes[name]}
                        onChange={(e) => setSizes((prev) => ({ ...prev, [name]: parseFloat(e.target.value) }))}
                        className="w-full accent-tertiary-sage cursor-pointer"
                      />
                      <p className="text-[11px] text-muted">
                        Default: {formatSize(name, DEFAULT_SIZE[name])}
                        {printSizes[name] !== sizes[name] && ` · prints as ${formatSize(name, printSizes[name])} to stay printable`}
                      </p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Pricing & Typography Catalog */}
              <div className="bg-white border border-border rounded-xl p-6 shadow-xs space-y-6">
                <div>
                  <h2 className="text-sm font-bold text-primary-navy">
                    Typography
                  </h2>
                  <p className="text-xs text-secondary-slate">
                    Default font style. Prices are set per product above.
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  {/* Default Font Style */}
                  <div>
                    <label className="block text-xs font-bold text-primary-navy uppercase tracking-wider mb-2">
                      Default Font
                    </label>
                    <select
                      value={defaultFont}
                      onChange={(e) => setDefaultFont(e.target.value)}
                      className="w-full h-10 px-3 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold focus:bg-white focus:outline-none focus:border-slate-800 transition-all cursor-pointer"
                    >
                      {FONT_STYLE_OPTIONS.map((font) => (
                        <option key={font.id} value={font.id}>
                          {font.name} — {font.family}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Available 3D Font Styles Grid */}
                <div className="space-y-3 pt-4 border-t border-slate-100">
                  <h3 className="text-xs font-bold text-primary-navy uppercase tracking-wider">
                    Available Fonts
                  </h3>
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2">
                    {FONT_STYLE_OPTIONS.map((f) => (
                      <div
                        key={f.id}
                        className={`p-2.5 rounded-lg border text-center transition-all ${
                          defaultFont === f.id
                            ? "bg-slate-900 text-white border-slate-900 shadow-xs"
                            : "bg-slate-50 border-slate-200 text-slate-700"
                        }`}
                      >
                        <div className="text-xs font-bold truncate">{f.name}</div>
                        <div className="text-[10px] opacity-75 font-mono truncate">{f.family}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Submit Save Button */}
              <div className="flex justify-end">
                <button
                  type="submit"
                  disabled={settingsSaving}
                  className="h-10 px-6 bg-primary-navy hover:bg-primary-navy-hover disabled:opacity-50 text-white font-bold text-xs rounded-lg shadow-sm flex items-center gap-2 transition-all cursor-pointer"
                >
                  {settingsSaving ? (
                    <>
                      <FontAwesomeIcon icon={faRotate} className="animate-spin text-xs" />
                      <span>Saving…</span>
                    </>
                  ) : (
                    <>
                      <FontAwesomeIcon icon={faCheck} className="text-xs" />
                      <span>Save Settings</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* ═══════════════════════════════════════════════════════
            TAB 4: LIVE 3D TEST BENCH
        ════════════════════════════════════════════════════════ */}
        {activeTab === "preview" && (
          <div className="space-y-6">
            <div className="bg-white border border-border rounded-xl p-5 shadow-xs flex flex-wrap items-center justify-between gap-4">
              <div>
                <h2 className="text-sm font-bold text-primary-navy">
                  3D Preview
                </h2>
                <p className="text-xs text-secondary-slate">
                  Test custom text, colors, and typography.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Left Controls */}
              <div className="bg-white border border-border rounded-xl p-5 shadow-xs space-y-4">
                <div>
                  <label className="block text-xs font-bold text-primary-navy uppercase tracking-wider mb-1.5">
                    Text
                  </label>
                  <input
                    type="text"
                    maxLength={20}
                    value={testText}
                    onChange={(e) => setTestText(e.target.value)}
                    className="w-full h-10 px-3 bg-slate-50 border border-slate-200 rounded-lg text-sm font-bold focus:bg-white focus:outline-none focus:border-slate-800 transition-all font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-primary-navy uppercase tracking-wider mb-1.5">
                    Font
                  </label>
                  <select
                    value={testFontStyle}
                    onChange={(e) => setTestFontStyle(e.target.value)}
                    className="w-full h-10 px-3 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold focus:bg-white focus:outline-none focus:border-slate-800 transition-all cursor-pointer"
                  >
                    {FONT_STYLE_OPTIONS.map((font) => (
                      <option key={font.id} value={font.id}>
                        {font.name} ({font.family})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-primary-navy uppercase tracking-wider mb-1.5">
                    Text Color
                  </label>
                  <div className="flex flex-wrap gap-1.5">
                    {colors
                      .filter((c) => c.inStock)
                      .map((c) => (
                        <button
                          key={c.id}
                          type="button"
                          onClick={() => setTestTextColor(c.hexCode)}
                          className={`w-7 h-7 rounded-full border-2 transition-all cursor-pointer ${
                            testTextColor === c.hexCode
                              ? "border-black scale-110 shadow-md ring-2 ring-emerald-500"
                              : "border-white hover:scale-105"
                          }`}
                          style={{ backgroundColor: c.hexCode }}
                          title={c.name}
                        />
                      ))}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-primary-navy uppercase tracking-wider mb-1.5">
                    Base Color
                  </label>
                  <div className="flex flex-wrap gap-1.5">
                    {colors
                      .filter((c) => c.inStock)
                      .map((c) => (
                        <button
                          key={c.id}
                          type="button"
                          onClick={() => setTestBaseColor(c.hexCode)}
                          className={`w-7 h-7 rounded-full border-2 transition-all cursor-pointer ${
                            testBaseColor === c.hexCode
                              ? "border-black scale-110 shadow-md ring-2 ring-emerald-500"
                              : "border-white hover:scale-105"
                          }`}
                          style={{ backgroundColor: c.hexCode }}
                          title={c.name}
                        />
                      ))}
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                  <span className="text-xs font-bold text-primary-navy">Keyring Loop</span>
                  <input
                    type="checkbox"
                    checked={testKeychainLoop}
                    onChange={(e) => setTestKeychainLoop(e.target.checked)}
                    className="w-4 h-4 accent-slate-900 cursor-pointer"
                  />
                </div>
              </div>

              {/* Right: 3D Canvas */}
              <div className="lg:col-span-2 bg-surface-muted border border-border rounded-xl overflow-hidden shadow-xs min-h-[360px]">
                <StudioCanvas
                  text={testText}
                  textColor={testTextColor}
                  baseColor={testBaseColor}
                  fontStyle={testFontStyle}
                  hasKeychainLoop={testKeychainLoop}
                  size={printSizes}
                />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ─────────────────────────────────────────────────────────
          MODAL: ADD NEW FILAMENT COLOR
      ────────────────────────────────────────────────────────── */}
      {isAddColorModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-md p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-sm font-bold text-primary-navy flex items-center gap-2">
                <FontAwesomeIcon icon={faPalette} className="text-emerald-600" />
                <span>Add Filament</span>
              </h3>
              <button
                onClick={() => setIsAddColorModalOpen(false)}
                className="w-7 h-7 rounded text-slate-400 hover:text-slate-700 flex items-center justify-center cursor-pointer"
              >
                <FontAwesomeIcon icon={faXmark} />
              </button>
            </div>

            <form onSubmit={handleCreateColor} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-primary-navy uppercase tracking-wider mb-1">
                  Name
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Silk Green"
                  value={newColorName}
                  onChange={(e) => setNewColorName(e.target.value)}
                  className="w-full h-10 px-3 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold focus:bg-white focus:outline-none focus:border-slate-800 transition-all"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-primary-navy uppercase tracking-wider mb-1">
                    Hex
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={newColorHex}
                      onChange={(e) => setNewColorHex(e.target.value.toUpperCase())}
                      className="w-9 h-10 rounded border border-slate-200 cursor-pointer p-0.5 bg-slate-50"
                    />
                    <input
                      type="text"
                      required
                      value={newColorHex}
                      onChange={(e) => setNewColorHex(e.target.value.toUpperCase())}
                      className="w-full h-10 px-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-mono font-bold uppercase focus:bg-white focus:outline-none focus:border-slate-800 transition-all"
                    />
                  </div>
                </div>

                <div>
                  <MaterialChecks value={newColorMaterials} onChange={setNewColorMaterials} />
                </div>
              </div>

              {/* Quick Preset Colors Palette */}
              <div>
                <label className="block text-[11px] font-semibold text-slate-500 mb-1.5">
                  Presets:
                </label>
                <div className="flex flex-wrap gap-2">
                  {[
                    "#111111",
                    "#F8FAFC",
                    "#FF6600",
                    "#00A3FF",
                    "#E50914",
                    "#FFD000",
                    "#059669",
                    "#FF2E93",
                    "#8B5CF6",
                    "#D4AF37",
                  ].map((hex) => (
                    <button
                      key={hex}
                      type="button"
                      onClick={() => setNewColorHex(hex)}
                      className="w-6 h-6 rounded-full border border-slate-300 shadow-xs cursor-pointer hover:scale-110 transition-transform"
                      style={{ backgroundColor: hex }}
                    />
                  ))}
                </div>
              </div>

              <div className="flex items-center gap-2 pt-2 border-t border-slate-100">
                <input
                  type="checkbox"
                  id="inStockCheck"
                  checked={newColorInStock}
                  onChange={(e) => setNewColorInStock(e.target.checked)}
                  className="w-4 h-4 accent-slate-900 cursor-pointer"
                />
                <label htmlFor="inStockCheck" className="text-xs font-bold text-primary-navy cursor-pointer">
                  In stock
                </label>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsAddColorModalOpen(false)}
                  className="h-9 px-4 rounded-lg text-xs font-semibold text-slate-600 hover:bg-slate-100 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={filamentActionLoading}
                  className="h-9 px-4 bg-tertiary-sage hover:bg-[#047857] text-white rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-xs transition-all cursor-pointer disabled:opacity-50"
                >
                  {filamentActionLoading ? "Adding…" : "Add Filament"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────
          MODAL: EDIT FILAMENT COLOR
      ────────────────────────────────────────────────────────── */}
      {editingColor && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-md p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-sm font-bold text-primary-navy flex items-center gap-2">
                <FontAwesomeIcon icon={faPenToSquare} className="text-slate-800" />
                <span>Edit Filament</span>
              </h3>
              <button
                onClick={() => setEditingColor(null)}
                className="w-7 h-7 rounded text-slate-400 hover:text-slate-700 flex items-center justify-center cursor-pointer"
              >
                <FontAwesomeIcon icon={faXmark} />
              </button>
            </div>

            <form onSubmit={handleUpdateColor} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-primary-navy uppercase tracking-wider mb-1">
                  Name
                </label>
                <input
                  type="text"
                  required
                  value={editingColor.name}
                  onChange={(e) =>
                    setEditingColor({ ...editingColor, name: e.target.value })
                  }
                  className="w-full h-10 px-3 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold focus:bg-white focus:outline-none focus:border-slate-800 transition-all"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-primary-navy uppercase tracking-wider mb-1">
                    Hex
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={editingColor.hexCode}
                      onChange={(e) =>
                        setEditingColor({
                          ...editingColor,
                          hexCode: e.target.value.toUpperCase(),
                        })
                      }
                      className="w-9 h-10 rounded border border-slate-200 cursor-pointer p-0.5 bg-slate-50"
                    />
                    <input
                      type="text"
                      required
                      value={editingColor.hexCode}
                      onChange={(e) =>
                        setEditingColor({
                          ...editingColor,
                          hexCode: e.target.value.toUpperCase(),
                        })
                      }
                      className="w-full h-10 px-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-mono font-bold uppercase focus:bg-white focus:outline-none focus:border-slate-800 transition-all"
                    />
                  </div>
                </div>

                <div>
                  <MaterialChecks
                    value={editingColor.materials}
                    onChange={(materials) => setEditingColor({ ...editingColor, materials })}
                  />
                </div>
              </div>

              <div className="flex items-center gap-2 pt-2 border-t border-slate-100">
                <input
                  type="checkbox"
                  id="editInStockCheck"
                  checked={editingColor.inStock}
                  onChange={(e) =>
                    setEditingColor({ ...editingColor, inStock: e.target.checked })
                  }
                  className="w-4 h-4 accent-slate-900 cursor-pointer"
                />
                <label htmlFor="editInStockCheck" className="text-xs font-bold text-primary-navy cursor-pointer">
                  In stock
                </label>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setEditingColor(null)}
                  className="h-9 px-4 rounded-lg text-xs font-semibold text-slate-600 hover:bg-slate-100 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={filamentActionLoading}
                  className="h-9 px-4 bg-primary-navy hover:bg-primary-navy-hover text-white rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-xs transition-all cursor-pointer disabled:opacity-50"
                >
                  {filamentActionLoading ? "Saving…" : "Save"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────
          PRINTABLE JOB TICKET MODAL
      ────────────────────────────────────────────────────────── */}
      {selectedTicketOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs print:p-0 print:bg-white">
          <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-lg p-6 shadow-2xl space-y-5 print:border-none print:shadow-none print:p-0">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <span className="text-[10px] font-mono font-bold uppercase tracking-wider bg-slate-900 text-white px-2 py-0.5 rounded">
                  JOB TICKET
                </span>
                <h3 className="text-base font-bold text-primary-navy mt-1">
                  PX-{selectedTicketOrder.id.slice(0, 8).toUpperCase()}
                </h3>
              </div>
              <button
                onClick={() => setSelectedTicketOrder(null)}
                className="w-7 h-7 rounded text-slate-400 hover:text-slate-700 flex items-center justify-center cursor-pointer print:hidden"
              >
                <FontAwesomeIcon icon={faXmark} />
              </button>
            </div>

            {/* Slicing Specifications Table */}
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 text-xs space-y-3 font-mono">
              <div className="flex justify-between border-b border-slate-200 pb-2">
                <span className="text-slate-500">Customer:</span>
                <span className="font-bold text-primary-navy">{selectedTicketOrder.customerName}</span>
              </div>
              <div className="flex justify-between border-b border-slate-200 pb-2">
                <span className="text-slate-500">Phone:</span>
                <span className="font-bold text-primary-navy">
                  {selectedTicketOrder.customerPhone || "N/A"}
                </span>
              </div>
              <div className="flex justify-between border-b border-slate-200 pb-2">
                <span className="text-slate-500">Status:</span>
                <span className="font-bold text-emerald-700 uppercase">
                  {selectedTicketOrder.status}
                </span>
              </div>
              <div className="flex justify-between border-b border-slate-200 pb-2">
                <span className="text-slate-500">Layer:</span>
                <span className="font-bold text-primary-navy">0.20mm Standard</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Bed:</span>
                <span className="font-bold text-primary-navy">60°C Textured PEI</span>
              </div>
            </div>

            {/* Items in Job */}
            <div className="space-y-2">
              <span className="text-xs font-bold text-primary-navy uppercase tracking-wider">
                Items ({selectedTicketOrder.orderItems.length})
              </span>
              {selectedTicketOrder.orderItems.map((item, i) => (
                <div
                  key={item.id}
                  className="border border-slate-200 rounded-lg p-3 bg-white text-xs space-y-1.5"
                >
                  <div className="flex items-center justify-between font-bold">
                    <span className="text-sm text-primary-navy whitespace-pre-line">{item.customText}</span>
                    <span className="font-mono text-slate-500">Qty: {item.quantity}</span>
                  </div>
                  <div className="flex items-center gap-4 text-[11px] text-secondary-slate">
                    <span>Top: <strong className="text-slate-900">{item.color.name}</strong></span>
                    <span>Base: <strong className="text-slate-900">{item.baseColor?.name || "Matte Black"}</strong></span>
                    {item.material && <span>Material: <strong className="text-slate-900">{materialName(item.material)}</strong></span>}
                  </div>
                </div>
              ))}
            </div>

            {/* Footer Buttons */}
            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100 print:hidden">
              <button
                type="button"
                onClick={() => setSelectedTicketOrder(null)}
                className="h-9 px-4 rounded-lg text-xs font-semibold text-slate-600 hover:bg-slate-100 cursor-pointer"
              >
                Close
              </button>
              <button
                type="button"
                onClick={() => window.print()}
                className="h-9 px-4 bg-primary-navy hover:bg-primary-navy-hover text-white rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-xs transition-all cursor-pointer"
              >
                <FontAwesomeIcon icon={faPrint} className="text-xs" />
                <span>Print Ticket</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
