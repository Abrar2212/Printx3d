// GET   /api/orders/[id]  — get single order
// PATCH /api/orders/[id]  — update order status (admin)

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";

const UpdateOrderSchema = z.object({
  status: z
    .enum(["PENDING", "CONFIRMED", "PRINTING", "PRINTED", "SHIPPED", "DELIVERED"])
    .optional(),
  paymentStatus: z.enum(["PENDING", "PAID", "FAILED"]).optional(),
});

interface RouteContext {
  params: Promise<{ id: string }>;
}

// ─── GET ──────────────────────────────────────────────────────
export async function GET(_req: NextRequest, { params }: RouteContext) {
  try {
    const { id } = await params;
    const order = await db.order.findUniqueOrThrow({
      where: { id },
      include: {
        orderItems: {
          include: {
            style: true,
            color: true,
            baseColor: true,
          },
        },
      },
    });

    return NextResponse.json(order);
  } catch {
    return NextResponse.json({ error: "Order not found" }, { status: 404 });
  }
}

// ─── PATCH ────────────────────────────────────────────────────
export async function PATCH(req: NextRequest, { params }: RouteContext) {
  try {
    const { id } = await params;
    const body = await req.json();
    const data = UpdateOrderSchema.parse(body);

    const order = await db.order.update({
      where: { id },
      data,
    });

    return NextResponse.json(order);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation failed", issues: error.issues },
        { status: 422 }
      );
    }
    console.error("[PATCH /api/orders/[id]]", error);
    return NextResponse.json({ error: "Failed to update order" }, { status: 500 });
  }
}

