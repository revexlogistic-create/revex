-- Ajouter la colonne blind_lot si elle n'existe pas
ALTER TABLE lots ADD COLUMN IF NOT EXISTS blind_lot BOOLEAN DEFAULT FALSE;
-- Mettre à jour les lots existants
UPDATE lots SET blind_lot = FALSE WHERE blind_lot IS NULL;
