-- AlterTable
ALTER TABLE "order_items" ADD COLUMN "base_color_id" TEXT,
ADD COLUMN "font_style" TEXT NOT NULL DEFAULT 'helvetiker_bold';

-- AddForeignKey
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_base_color_id_fkey" FOREIGN KEY ("base_color_id") REFERENCES "colors"("id") ON DELETE SET NULL ON UPDATE CASCADE;
