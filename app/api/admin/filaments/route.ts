import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";

const CreateColorSchema = z.object({
  name: z.string().min(2, "Color name must be at least 2 characters").max(50),
  hexCode: z.string().regex(/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/, "Invalid Hex color"),
  materialType: z.enum(["PLA", "PETG", "TPU"]).default("PLA"),
  inStock: z.boolean().default(true),
});

export async function GET() {
  try {
    const colors = await db.color.findMany({
      orderBy: { name: "asc" },
    });
    return NextResponse.json(colors);
  } catch (error) {
    console.error("Failed to fetch filament colors:", error);
    return NextResponse.json({ error: "Failed to fetch colors" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const data = CreateColorSchema.parse(body);

    // Generate unique ID based on name
    const slug = data.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
    const id = `color-${slug}-${Date.now().toString(36)}`;

    const created = await db.color.create({
      data: {
        id,
        name: data.name,
        hexCode: data.hexCode.toUpperCase(),
        materialType: data.materialType,
        inStock: data.inStock,
      },
    });

    return NextResponse.json(created, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Validation failed", issues: error.issues }, { status: 422 });
    }
    console.error("Failed to create filament color:", error);
    return NextResponse.json({ error: "Failed to create color" }, { status: 500 });
  }
}

