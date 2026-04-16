-- Migration : ajout colonne is_auto sur products
-- Distingue les pièces automobile (particuliers) des PDR industriels (entreprises)

ALTER TABLE products ADD COLUMN IF NOT EXISTS is_auto BOOLEAN DEFAULT FALSE;
ALTER TABLE products ADD COLUMN IF NOT EXISTS vehicle_make  VARCHAR(100);
ALTER TABLE products ADD COLUMN IF NOT EXISTS vehicle_model VARCHAR(100);
ALTER TABLE products ADD COLUMN IF NOT EXISTS vehicle_year  INTEGER;

CREATE INDEX IF NOT EXISTS idx_products_is_auto ON products(is_auto) WHERE is_auto = TRUE;

-- Optionnel : créer une catégorie auto si elle n'existe pas
INSERT INTO categories (name, slug, icon, sort_order)
VALUES ('Pièces Automobile', 'pieces-auto', '🚗', 99)
ON CONFLICT (slug) DO NOTHING;
