ALTER TABLE disputes ADD COLUMN IF NOT EXISTS evidence_urls        JSONB DEFAULT '[]';
ALTER TABLE disputes ADD COLUMN IF NOT EXISTS seller_response      TEXT;
ALTER TABLE disputes ADD COLUMN IF NOT EXISTS seller_evidence_urls JSONB DEFAULT '[]';
ALTER TABLE disputes ADD COLUMN IF NOT EXISTS seller_responded_at  TIMESTAMP WITH TIME ZONE;
ALTER TABLE disputes ADD COLUMN IF NOT EXISTS priority             VARCHAR(20) DEFAULT 'normal';
ALTER TABLE disputes ADD COLUMN IF NOT EXISTS admin_notes          TEXT;
ALTER TABLE disputes ADD COLUMN IF NOT EXISTS resolved_by          UUID REFERENCES users(id);
ALTER TABLE disputes ADD COLUMN IF NOT EXISTS resolved_at          TIMESTAMP WITH TIME ZONE;
ALTER TABLE disputes ADD COLUMN IF NOT EXISTS resolution           TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS status_old             VARCHAR(30); -- backup
-- Permettre le statut 'disputed' sur les commandes
