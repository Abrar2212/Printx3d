import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { MATERIAL_IDS } from "@/lib/materials";

const UpdateColorSchema = z.object({
  name: z.string().min(2).max(50).optional(),
  hexCode: z.string().regex(/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/).optional(),
  materials: z.array(z.enum(MATERIAL_IDS)).min(1, "Choose at least one material").optional(),
  inStock: z.boolean().optional(),
});

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function PATCH(req: NextRequest, { params }: RouteContext) {
  try {
    const { id } = await params;
    const body = await req.json();
    const data = UpdateColorSchema.parse(body);

    const updated = await db.color.update({
      where: { id },
      data: {
        ...(data.name && { name: data.name }),
        ...(data.hexCode && { hexCode: data.hexCode.toUpperCase() }),
        ...(data.materials && { materials: data.materials }),
        ...(data.inStock !== undefined && { inStock: data.inStock }),
      },
    });

    return NextResponse.json(updated);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Validation failed", issues: error.issues }, { status: 422 });
    }
    console.error("Failed to update filament color:", error);
    return NextResponse.json({ error: "Failed to update color" }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: RouteContext) {
  try {
    const { id } = await params;

    // Check if any order items reference this color
    const referencedCount = await db.orderItem.count({
      where: {
        OR: [{ colorId: id }, { baseColorId: id }],
      },
    });

    if (referencedCount > 0) {
      // Safely soft-archive: mark as out of stock instead of hard-deleting
      const softDeleted = await db.color.update({
        where: { id },
        data: { inStock: false },
      });
      return NextResponse.json({
        message: "Color referenced by existing orders; archived (marked out of stock)",
        color: softDeleted,
      });
    }

    await db.color.delete({
      where: { id },
    });

    return NextResponse.json({ message: "Color deleted successfully" });
  } catch (error) {
    console.error("Failed to delete filament color:", error);
    return NextResponse.json({ error: "Failed to delete color" }, { status: 500 });
  }
}

