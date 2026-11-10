import { db } from "@/lib/db";
import AdminDashboard from "@/components/admin/AdminDashboard";

export const dynamic = "force-dynamic";

export default async function OperatorPage() {
  const orders = await db.order.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      orderItems: {
        include: {
          style: { select: { id: true, name: true } },
          color: { select: { id: true, name: true, hexCode: true } },
          baseColor: { select: { id: true, name: true, hexCode: true } },
        },
      },
    },
  });

  const serialized = orders.map((o) => ({
    ...o,
    totalPrice: Number(o.totalPrice),
    createdAt: o.createdAt.toISOString(),
    updatedAt: o.updatedAt.toISOString(),
    orderItems: o.orderItems.map((i) => ({
      ...i,
      unitPrice: Number(i.unitPrice),
    })),
  }));

  return <AdminDashboard orders={serialized} />;
}

