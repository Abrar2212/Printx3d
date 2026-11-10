import { db } from "@/lib/db";
import CheckoutForm from "@/components/customizer/CheckoutForm";

export const dynamic = "force-dynamic";

export default async function CheckoutPage({
  searchParams,
}: {
  searchParams: Promise<{
    styleId?: string;
    colorId?: string;
    baseColorId?: string;
    fontStyle?: string;
    text?: string;
  }>;
}) {
  const params = await searchParams;
  const [styles, colors] = await Promise.all([
    db.style.findMany({ where: { isActive: true }, orderBy: { name: "asc" } }),
    db.color.findMany({ where: { inStock: true }, orderBy: { name: "asc" } }),
  ]);

  const serializedStyles = styles.map((s) => ({
    ...s,
    basePrice: Number(s.basePrice),
    config: s.config as any,
  }));

  return (
    <CheckoutForm
      styles={serializedStyles}
      colors={colors}
      defaultStyleId={params.styleId ?? null}
      defaultColorId={params.colorId ?? null}
      defaultBaseColorId={params.baseColorId ?? null}
      defaultFontStyle={params.fontStyle ?? "helvetiker_bold"}
      defaultText={params.text ?? ""}
    />
  );
}
