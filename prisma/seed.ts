import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Seeding database with custom key styles & vibrant filaments...");

  // ─── Styles ────────────────────────────────────────────────
  const styles = await Promise.all([
    prisma.style.upsert({
      where: { id: "style-keychain" },
      update: {
        name: "Custom Contour Keychain",
        basePrice: 5.99,
        config: { extrusionDepth: 4, bevel: 0.5, hasBasePlate: true, hasKeychainLoop: true },
      },
      create: {
        id: "style-keychain",
        name: "Custom Contour Keychain",
        fontFamily: "helvetiker_bold",
        basePrice: 5.99,
        config: { extrusionDepth: 4, bevel: 0.5, hasBasePlate: true, hasKeychainLoop: true },
        isActive: true,
      },
    }),
    prisma.style.upsert({
      where: { id: "style-desk-nameplate" },
      update: {
        name: "Desk Plaque Stand",
        basePrice: 12.99,
        config: { extrusionDepth: 8, bevel: 0.8, hasBasePlate: true, hasKeychainLoop: false },
      },
      create: {
        id: "style-desk-nameplate",
        name: "Desk Plaque Stand",
        fontFamily: "droid_sans_bold",
        basePrice: 12.99,
        config: { extrusionDepth: 8, bevel: 0.8, hasBasePlate: true, hasKeychainLoop: false },
        isActive: true,
      },
    }),
  ]);

  // ─── Colors / Filaments (Matching Real Two-Tone Keychain Prints) ──
  const colorData = [
    { id: "color-matte-black", name: "Matte Black", hexCode: "#111111", inStock: true },
    { id: "color-arctic-white", name: "Arctic White", hexCode: "#F8FAFC", inStock: true },
    { id: "color-flame-orange", name: "Flame Orange", hexCode: "#FF6600", inStock: true },
    { id: "color-sky-blue", name: "Sky Cyan", hexCode: "#00A3FF", inStock: true },
    { id: "color-royal-blue", name: "Royal Blue", hexCode: "#0047AB", inStock: true },
    { id: "color-fire-red", name: "Fire Red", hexCode: "#E50914", inStock: true },
    { id: "color-sun-yellow", name: "Sunflower Yellow", hexCode: "#FFD000", inStock: true },
    { id: "color-bubble-pink", name: "Hot Pink", hexCode: "#FF2E93", inStock: true },
    { id: "color-silk-gold", name: "Silk Gold", hexCode: "#D4AF37", inStock: true },
    { id: "color-emerald-green", name: "Emerald Green", hexCode: "#059669", inStock: true },
    { id: "color-lavender-purple", name: "Lavender Purple", hexCode: "#8B5CF6", inStock: true },
    { id: "color-mint-cyan", name: "Mint Cyan", hexCode: "#00E5BA", inStock: true },
  ];

  const colors = await Promise.all(
    colorData.map((c) =>
      prisma.color.upsert({
        where: { id: c.id },
        update: { name: c.name, hexCode: c.hexCode, inStock: c.inStock },
        create: c,
      })
    )
  );

  console.log(`✅ Seeded ${styles.length} styles and ${colors.length} high-fidelity filament colors.`);
}

main()
  .catch((e) => {
    console.error("❌ Seed failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
