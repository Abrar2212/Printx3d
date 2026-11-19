import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";

const UpdateStyleSchema = z.object({
  name: z.string().min(2).optional(),
  fontFamily: z.string().optional(),
  basePrice: z.number().min(0).optional(),
  isActive: z.boolean().optional(),
  config: z
    .object({
      fontSize: z.number().optional(),
      extrusionDepth: z.number().optional(),
      baseDepth: z.number().optional(),
      offsetRadius: z.number().optional(),
      earRadius: z.number().optional(),
      holeRadius: z.number().optional(),
      bevel: z.number().optional(),
      hasBasePlate: z.boolean().optional(),
      hasKeychainLoop: z.boolean().optional(),
      maxLines: z.number().int().min(1).max(3).optional(), // lines of customer text
    })
    .passthrough()
    .optional(),
});

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function PATCH(req: NextRequest, { params }: RouteContext) {
  try {
    const { id } = await params;
    const body = await req.json();
    const data = UpdateStyleSchema.parse(body);

    const existing = await db.style.findUniqueOrThrow({ where: { id } });
    const existingConfig = (existing.config as Record<string, unknown>) || {};
    const mergedConfig = data.config
      ? { ...existingConfig, ...data.config }
      : existingConfig;

    const updated = await db.style.update({
      where: { id },
      data: {
        ...(data.name && { name: data.name }),
        ...(data.fontFamily && { fontFamily: data.fontFamily }),
        ...(data.basePrice !== undefined && { basePrice: data.basePrice }),
        ...(data.isActive !== undefined && { isActive: data.isActive }),
        config: mergedConfig as any,
      },
    });

    return NextResponse.json({
      ...updated,
      basePrice: Number(updated.basePrice),
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Validation failed", issues: error.issues }, { status: 422 });
    }
    console.error("Failed to update style config:", error);
    return NextResponse.json({ error: "Failed to update style" }, { status: 500 });
  }
}
