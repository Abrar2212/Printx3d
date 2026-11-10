import { db } from "@/lib/db";
import { notFound } from "next/navigation";
import OrderTracker from "@/components/OrderTracker";

export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ orderId: string }>;
}

const STATUS_STEPS = [
  "PENDING",
  "CONFIRMED",
  "PRINTING",
  "PRINTED",
  "SHIPPED",
  "DELIVERED",
] as const;

export default async function TrackOrderPage({ params }: PageProps) {
  const { orderId } = await params;
  const cleanId = orderId.replace(/^PX-/i, "").toLowerCase();

  let order = await db.order.findUnique({
    where: { id: orderId },
    include: {
      orderItems: {
        include: {
          style: { select: { name: true } },
          color: { select: { name: true, hexCode: true } },
          baseColor: { select: { name: true, hexCode: true } },
        },
      },
    },
  });

  // If not found by exact UUID, match by short ID prefix (e.g. PX-3A8F1C2B)
  if (!order) {
    const matches = await db.order.findMany({
      where: {
        id: { startsWith: cleanId },
      },
      include: {
        orderItems: {
          include: {
            style: { select: { name: true } },
            color: { select: { name: true, hexCode: true } },
            baseColor: { select: { name: true, hexCode: true } },
          },
        },
      },
      take: 1,
    });
    order = matches[0] ?? null;
  }

  if (!order) notFound();

  const serialized = {
    ...order,
    totalPrice: Number(order.totalPrice),
    createdAt: order.createdAt.toISOString(),
    updatedAt: order.updatedAt.toISOString(),
    orderItems: order.orderItems.map((i) => ({
      ...i,
      unitPrice: Number(i.unitPrice),
    })),
  };

  return <OrderTracker order={serialized} statusSteps={STATUS_STEPS} />;
}
