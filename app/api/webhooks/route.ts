// POST /api/webhooks — payment gateway webhook handler
// Verifies the webhook signature and updates payment status.

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function POST(req: NextRequest) {
  try {
    const signature = req.headers.get("x-webhook-signature");
    const secret = process.env.PAYMENT_WEBHOOK_SECRET;

    // TODO: Replace with your gateway's actual signature verification
    if (!signature || signature !== secret) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const payload = await req.json();
    const { orderId, status } = payload;

    if (!orderId || !status) {
      return NextResponse.json({ error: "Missing orderId or status" }, { status: 400 });
    }

    await db.order.update({
      where: { id: orderId },
      data: {
        paymentStatus: status === "success" ? "PAID" : "FAILED",
        status: status === "success" ? "CONFIRMED" : "PENDING",
      },
    });

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error("[POST /api/webhooks]", error);
    return NextResponse.json({ error: "Webhook processing failed" }, { status: 500 });
  }
}

