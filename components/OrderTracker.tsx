import Link from "next/link";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faCheck } from "@fortawesome/free-solid-svg-icons";
import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";
import { oneLine } from "@/lib/keychain-text";

type OrderStatus = "PENDING" | "CONFIRMED" | "PRINTING" | "PRINTED" | "SHIPPED" | "DELIVERED";

interface OrderItem {
  id: string;
  customText: string;
  quantity: number;
  unitPrice: number;
  color: { name: string; hexCode: string };
  baseColor?: { name: string; hexCode: string } | null;
}

// Public page: no name, phone or address. Anyone with the order code can open it.
interface Order {
  id: string;
  status: OrderStatus;
  totalPrice: number;
  createdAt: string;
  orderItems: OrderItem[];
}

interface Props {
  order: Order;
  statusSteps: readonly OrderStatus[];
}

const STEP_LABELS: Record<OrderStatus, { title: string; text: string }> = {
  PENDING: { title: "Order received", text: "We've got your order." },
  CONFIRMED: { title: "Confirmed", text: "We called you and confirmed the details." },
  PRINTING: { title: "Printing", text: "Your keychain is on the printer." },
  PRINTED: { title: "Ready", text: "Printed, checked and packed." },
  SHIPPED: { title: "On the way", text: "Handed to the courier." },
  DELIVERED: { title: "Delivered", text: "Enjoy your keychain!" },
};

export default function OrderTracker({ order, statusSteps }: Props) {
  const currentIndex = statusSteps.indexOf(order.status);
  const code = `PX-${order.id.slice(0, 8).toUpperCase()}`;

  return (
    <div className="min-h-screen flex flex-col bg-cream text-primary-navy">
      <SiteHeader />

      <main className="flex-1 w-full max-w-xl mx-auto px-4 sm:px-6 py-10 space-y-8">
        <div>
          <p className="text-sm text-secondary-slate">Order {code}</p>
          <h1 className="text-3xl font-extrabold tracking-tight mt-1">{STEP_LABELS[order.status].title}</h1>
          <p className="text-secondary-slate mt-1">
            Placed{" "}
            {new Date(order.createdAt).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })}
          </p>
        </div>

        {/* ── Timeline ── */}
        <ol className="bg-surface border border-border rounded-2xl p-6">
          {statusSteps.map((step, i) => {
            const done = i < currentIndex;
            const current = i === currentIndex;
            const last = i === statusSteps.length - 1;
            return (
              <li key={step} className="flex gap-4" aria-current={current ? "step" : undefined}>
                <div className="flex flex-col items-center">
                  <span
                    className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
                      done
                        ? "bg-tertiary-sage text-white"
                        : current
                          ? "bg-primary-navy text-white ring-4 ring-primary-navy/10"
                          : "bg-surface-muted text-secondary-slate"
                    }`}
                  >
                    {done ? <FontAwesomeIcon icon={faCheck} /> : i + 1}
                  </span>
                  {!last && <span className={`w-0.5 flex-1 min-h-6 my-1 ${done ? "bg-tertiary-sage" : "bg-border"}`} />}
                </div>
                <div className={last ? "" : "pb-5"}>
                  <p className={`font-semibold ${done || current ? "text-primary-navy" : "text-secondary-slate"}`}>
                    {STEP_LABELS[step].title}
                  </p>
                  {current && <p className="text-sm text-secondary-slate mt-0.5">{STEP_LABELS[step].text}</p>}
                </div>
              </li>
            );
          })}
        </ol>

        {/* ── Items ── */}
        <div className="bg-surface border border-border rounded-2xl divide-y divide-border">
          {order.orderItems.map((item) => (
            <div key={item.id} className="flex items-center gap-4 p-5">
              <span
                aria-hidden
                className="w-10 h-10 rounded-full shrink-0 flex items-center justify-center border border-black/10"
                style={{ backgroundColor: item.baseColor?.hexCode ?? "#111111" }}
              >
                <span className="w-4 h-4 rounded-full border border-black/10" style={{ backgroundColor: item.color.hexCode }} />
              </span>
              <div className="min-w-0">
                <p className="font-semibold truncate">&ldquo;{oneLine(item.customText)}&rdquo;</p>
                <p className="text-sm text-secondary-slate">
                  {item.color.name} on {item.baseColor?.name ?? "Black"} · × {item.quantity}
                </p>
              </div>
              <span className="ml-auto font-semibold tabular-nums">৳{(item.unitPrice * item.quantity).toFixed(2)}</span>
            </div>
          ))}
          <div className="flex justify-between p-5 font-semibold">
            <span>Total (cash on delivery)</span>
            <span className="tabular-nums">৳{order.totalPrice.toFixed(2)}</span>
          </div>
        </div>

        {order.status === "DELIVERED" && (
          <Link
            href="/#studio"
            className="h-12 w-full rounded-full bg-brand hover:bg-brand-hover text-white font-bold flex items-center justify-center transition-colors focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-brand/30"
          >
            Design another one
          </Link>
        )}
      </main>

      <SiteFooter />
    </div>
  );
}
