-- Customers choose PLA+ or TPU: each colour lists the materials it is stocked in (both, until the
-- admin changes it) and each order item stores the choice (null on older orders).
ALTER TABLE "colors" ADD COLUMN "materials" TEXT[] DEFAULT ARRAY['PLA', 'TPU']::TEXT[];
ALTER TABLE "order_items" ADD COLUMN "material" TEXT;

-- No longer written by the app; kept so the previous version still runs during a deploy.
ALTER TABLE "colors" ALTER COLUMN "material_type" SET DEFAULT 'PLA';
