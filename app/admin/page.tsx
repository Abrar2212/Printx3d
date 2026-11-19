import { db } from "@/lib/db";
import AdminDashboard from "@/components/admin/AdminDashboard";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const [orders, colors, styles] = await Promise.all([
    db.order.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        orderItems: {
          include: {
            style: { select: { id: true, name: true, config: true } },
            color: { select: { id: true, name: true, hexCode: true } },
            baseColor: { select: { id: true, name: true, hexCode: true } },
          },
        },
      },
    }),
    db.color.findMany({
      orderBy: { name: "asc" },
    }),
    db.style.findMany({
      orderBy: { name: "asc" },
    }),
  ]);

  const serializedOrders = orders.map((o) => ({
    ...o,
    totalPrice: Number(o.totalPrice),
    createdAt: o.createdAt.toISOString(),
    updatedAt: o.updatedAt.toISOString(),
    orderItems: o.orderItems.map((i) => ({
      ...i,
      unitPrice: Number(i.unitPrice),
      style: {
        ...i.style,
        config: (i.style.config as Record<string, unknown>) || {},
      },
    })),
  }));

  const serializedStyles = styles.map((s) => ({
    ...s,
    basePrice: Number(s.basePrice),
    config: (s.config as Record<string, unknown>) || {},
  }));

  return (
    <AdminDashboard
      orders={serializedOrders}
      role="admin"
      initialColors={colors}
      initialStyles={serializedStyles}
    />
  );
}
