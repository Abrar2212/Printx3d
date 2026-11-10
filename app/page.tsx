// Landing page — fetches styles & colors from DB, renders Customizer Studio
import { db } from "@/lib/db";
import CustomizerStudio from "@/components/customizer/CustomizerStudio";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const [styles, colors] = await Promise.all([
    db.style.findMany({ where: { isActive: true }, orderBy: { name: "asc" } }),
    db.color.findMany({ where: { inStock: true }, orderBy: { name: "asc" } }),
  ]);

  // Serialize Decimal → number for client props
  const serializedStyles = styles.map((s) => ({
    ...s,
    basePrice: Number(s.basePrice),
    config: s.config as any,
  }));

  return <CustomizerStudio styles={serializedStyles} colors={colors} />;
}
