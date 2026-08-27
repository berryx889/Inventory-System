ALTER TABLE "InventoryItem" ADD COLUMN "storageLocation" TEXT NOT NULL DEFAULT 'A-12';
ALTER TABLE "StockMovement" ADD COLUMN "sourceLocation" TEXT;
ALTER TABLE "StockMovement" ADD COLUMN "destinationLocation" TEXT;
ALTER TABLE "StockMovement" ADD COLUMN "printReceipt" BOOLEAN NOT NULL DEFAULT false;

INSERT INTO "InventoryCategory" ("id", "name", "status", "createdAt", "updatedAt")
VALUES ('cleanware-cleaning-supplies', 'Cleaning Supplies', 'ACTIVE', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("name") DO UPDATE SET "status" = 'ACTIVE', "updatedAt" = CURRENT_TIMESTAMP;

WITH category AS (SELECT "id" FROM "InventoryCategory" WHERE "name" = 'Cleaning Supplies' LIMIT 1)
INSERT INTO "InventoryItem" ("id", "sku", "name", "categoryId", "unit", "storageLocation", "currentQuantity", "minimumStockLevel", "status", "version", "createdAt", "updatedAt")
SELECT v.id, v.sku, v.name, category."id", v.unit, v.location, v.quantity, 10, 'ACTIVE', 0, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM category
CROSS JOIN (VALUES
  ('cleanware-tissue', 'TIS-001', 'Tissue', 'Roll', 'A-12', 120),
  ('cleanware-soap', 'LS-001', 'Soap', 'Bottle', 'D-05', 67),
  ('cleanware-broom', 'BRM-001', 'Broom', 'Piece', 'C-11', 29),
  ('cleanware-bleach', 'BLH-001', 'Bleach', 'Bottle', 'D-02', 45),
  ('cleanware-collector', 'COL-001', 'Collector', 'Piece', 'B-04', 18),
  ('cleanware-dust-bin', 'BIN-001', 'Dust Bin', 'Piece', 'B-12', 12),
  ('cleanware-sweeper', 'SWP-001', 'Sweeper', 'Piece', 'C-09', 24),
  ('cleanware-mop', 'MOP-001', 'Mop', 'Piece', 'C-07', 32),
  ('cleanware-air-freshener', 'AIR-001', 'Air Freshener', 'Bottle', 'D-08', 52),
  ('cleanware-troll', 'TR-001', 'T-Roll', 'Roll', 'A-15', 85)
) AS v(id, sku, name, unit, location, quantity)
ON CONFLICT ("sku") DO UPDATE SET
  "name" = EXCLUDED."name",
  "unit" = EXCLUDED."unit",
  "storageLocation" = EXCLUDED."storageLocation",
  "minimumStockLevel" = 10,
  "status" = 'ACTIVE',
  "updatedAt" = CURRENT_TIMESTAMP;
