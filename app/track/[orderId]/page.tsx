import { db } from "@/lib/db";
import { notFound } from "next/navigation";
import OrderTracker from "@/components/OrderTracker";

export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ orderId: string }>;
}

const STATUS_STEPS = ["PENDING", "CONFIRMED", "PRINTING", "PRINTED", "SHIPPED", "DELIVERED"] as const;

// Only what the public tracker shows; never the customer's name, phone or address.
const select = {
  id: true,
  status: true,
  totalPrice: true,
  createdAt: true,
  orderItems: {
    select: {
      id: true,
      customText: true,
      material: true,
      quantity: true,
      unitPrice: true,
      color: { select: { name: true, hexCode: true } },
      baseColor: { select: { name: true, hexCode: true } },
    },
  },
} as const;

export default async function TrackOrderPage({ params }: PageProps) {
  const { orderId } = await params;
  const cleanId = orderId.replace(/^PX-/i, "").toLowerCase();

  // Full UUID, or the 8-character order code (PX-3A8F1C2B). Shorter prefixes would let
  // anyone browse other people's orders by guessing a character or two.
  const order = /^[0-9a-f-]{36}$/.test(cleanId)
    ? await db.order.findUnique({ where: { id: cleanId }, select })
    : /^[0-9a-f]{8}$/.test(cleanId)
      ? await db.order.findFirst({ where: { id: { startsWith: cleanId } }, select })
      : null;

  if (!order) notFound();

  const serialized = {
    ...order,
    totalPrice: Number(order.totalPrice),
    createdAt: order.createdAt.toISOString(),
    orderItems: order.orderItems.map((i) => ({ ...i, unitPrice: Number(i.unitPrice) })),
  };

  return <OrderTracker order={serialized} statusSteps={STATUS_STEPS} />;
}
