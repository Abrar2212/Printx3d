-- Retire the "Tactile Wall Plate" product: hidden from the shop and the admin price list.
-- Not deleted, because existing orders still reference it.
UPDATE "styles" SET "is_active" = false WHERE "id" = 'style-wall-sign';
