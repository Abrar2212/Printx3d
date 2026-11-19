import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { generateKeychainSTL } from "@/lib/stl-generator";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Support either full UUID or short ID prefix (e.g. from #PX-XXXXXXX)
    const cleanId = id.replace(/^PX-/, "");

    const order = await db.order.findFirst({
      where: {
        OR: [
          { id: cleanId },
          { id: { startsWith: cleanId } },
        ],
      },
      include: {
        orderItems: {
          include: {
            color: true,
            baseColor: true,
            style: true,
          },
        },
      },
    });

    if (!order || order.orderItems.length === 0) {
      return NextResponse.json(
        { error: "Order or order items not found" },
        { status: 404 }
      );
    }

    // Default to first item or query param `itemIndex`
    const searchParams = req.nextUrl.searchParams;
    const itemIndex = parseInt(searchParams.get("item") || "0", 10);
    const item = order.orderItems[itemIndex] || order.orderItems[0];

    const customText = item.customText || "KEY";
    const fontStyle = item.fontStyle || "helvetiker_bold";
    const hasKeychainLoop = !item.style?.name?.toLowerCase().includes("plate");

    // Generate physical binary STL
    const stlBuffer = generateKeychainSTL({
      text: customText,
      fontStyle,
      hasKeychainLoop,
      scale: 16.0,
    });

    // Sanitize filename for operating systems and slicers (Bambu Studio, PrusaSlicer, Cura)
    const safeName = customText.replace(/[^a-zA-Z0-9_-]/g, "_");
    const shortCode = order.id.slice(0, 8).toUpperCase();
    const filename = `PrintX3D_${safeName}_PX-${shortCode}.stl`;

    return new Response(stlBuffer as unknown as BodyInit, {
      status: 200,
      headers: {
        "Content-Type": "application/sla",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Content-Length": stlBuffer.byteLength.toString(),
        "Cache-Control": "public, max-age=3600, immutable",
      },
    });
  } catch (err: any) {
    console.error("Error generating STL:", err);
    return NextResponse.json(
      { error: "Failed to generate STL", details: err?.message },
      { status: 500 }
    );
  }
}

