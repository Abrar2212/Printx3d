// GET  /api/orders     — list all orders (admin)
// POST /api/orders     — create a new order

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { FONT_STYLE_OPTIONS } from "@/types";
import { keychainText, lineLimit, MAX_LINE_CHARS, MAX_LINES } from "@/lib/keychain-text";

const FONT_IDS = new Set(FONT_STYLE_OPTIONS.map((f) => f.id));

// ─── Zod validation schema ────────────────────────────────────
const CreateOrderSchema = z.object({
  customText: z
    .string()
    .min(1, "Custom text is required")
    .refine((t) => t.split(/\r?\n/).filter((l) => l.trim()).length > 0, "Custom text is required")
    .refine(
      (t) => t.split(/\r?\n/).filter((l) => l.trim()).length <= MAX_LINES,
      `At most ${MAX_LINES} lines`
    )
    .refine(
      (t) => t.split(/\r?\n/).every((l) => l.trim().length <= MAX_LINE_CHARS),
      `At most ${MAX_LINE_CHARS} characters per line`
    ),
  styleId: z.string().min(1, "Style is required"),
  colorId: z.string().min(1, "Text color is required"),
  baseColorId: z.string().optional().nullable(),
  // Must be a known font: the STL generator turns this into a file path.
  fontStyle: z
    .string()
    .refine((id) => FONT_IDS.has(id), "Unknown font")
    .optional()
    .default("helvetiker_bold"),
  quantity: z.number().int().min(1).max(20).default(1),
  customerName: z.string().max(100).optional().default("Customer"),
  customerEmail: z.string().email().optional().or(z.literal("")),
  customerPhone: z.string().min(5, "Phone number is required"),
  shippingAddress: z.string().min(5, "Please enter a full delivery address"),
});

// ─── GET ──────────────────────────────────────────────────────
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status");

    const orders = await db.order.findMany({
      where: status ? { status: status as any } : undefined,
      include: {
        orderItems: {
          include: {
            style: { select: { id: true, name: true, fontFamily: true } },
            color: { select: { id: true, name: true, hexCode: true } },
            baseColor: { select: { id: true, name: true, hexCode: true } },
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(orders);
  } catch (error) {
    console.error("[GET /api/orders]", error);
    return NextResponse.json({ error: "Failed to fetch orders" }, { status: 500 });
  }
}

// ─── POST ─────────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const data = CreateOrderSchema.parse(body);

    // Fetch the style to get the base price; retired products (e.g. Tactile Wall Plate) can't be ordered
    const style = await db.style.findFirst({
      where: { id: data.styleId, isActive: true },
    });
    if (!style) {
      return NextResponse.json({ error: "This product is no longer available." }, { status: 422 });
    }

    // The admin "Lines" setting for this style may allow fewer than 3 lines.
    const limit = lineLimit(style.config);
    if (data.customText.split(/\r?\n/).filter((l) => l.trim()).length > limit) {
      return NextResponse.json(
        { error: `This product allows at most ${limit} line${limit > 1 ? "s" : ""} of text.` },
        { status: 422 }
      );
    }
    const customText = keychainText(data.customText, limit); // stored exactly as it will print

    const unitPrice = Number(style.basePrice);
    const totalPrice = unitPrice * data.quantity;

    const sanitizedPhone = data.customerPhone.trim();
    const sanitizedEmail =
      data.customerEmail?.trim() ||
      `${sanitizedPhone.replace(/\D/g, "") || "order"}@printx3d.local`;

    const order = await db.order.create({
      data: {
        customerName: data.customerName?.trim() || "Customer",
        customerEmail: sanitizedEmail,
        customerPhone: sanitizedPhone,
        shippingAddress: data.shippingAddress.trim(),
        totalPrice,
        status: "PENDING",
        paymentStatus: "PENDING",
        orderItems: {
          create: {
            styleId: data.styleId,
            colorId: data.colorId,
            baseColorId: data.baseColorId || null,
            fontStyle: data.fontStyle || "helvetiker_bold",
            customText,
            quantity: data.quantity,
            unitPrice,
          },
        },
      },
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

    const orderCode = `PX-${order.id.slice(0, 8).toUpperCase()}`;

    return NextResponse.json({ ...order, orderCode }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation failed", issues: error.issues },
        { status: 422 }
      );
    }
    console.error("[POST /api/orders]", error);
    return NextResponse.json({ error: "Failed to create order" }, { status: 500 });
  }
}
