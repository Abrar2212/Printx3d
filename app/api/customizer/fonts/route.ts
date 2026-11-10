// GET /api/customizer/fonts — returns active styles and font options

import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET() {
  try {
    const styles = await db.style.findMany({
      where: { isActive: true },
      orderBy: { name: "asc" },
    });

    const colors = await db.color.findMany({
      where: { inStock: true },
      orderBy: { name: "asc" },
    });

    return NextResponse.json({ styles, colors });
  } catch (error) {
    console.error("[GET /api/customizer/fonts]", error);
    return NextResponse.json(
      { error: "Failed to fetch customizer data" },
      { status: 500 }
    );
  }
}

