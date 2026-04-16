-- storage_requests table
CREATE TABLE IF NOT EXISTS storage_requests (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  seller_id       UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  status          VARCHAR(20) NOT NULL DEFAULT 'pending'
                  CHECK (status IN ('pending','confirmed','active','completed','rejected')),

  -- Contact
  contact_name    VARCHAR(200) NOT NULL,
  company_name    VARCHAR(200),
  contact_phone   VARCHAR(50)  NOT NULL,
  contact_email   VARCHAR(200),
  city            VARCHAR(100) NOT NULL,

  -- Stockage
  storage_type    VARCHAR(20) DEFAULT 'long'
                  CHECK (storage_type IN ('court','long','indefini')),
  start_date      DATE,

  -- Articles
  selected_product_ids  JSONB DEFAULT '[]',
  custom_items    TEXT,
  estimated_vol   DECIMAL(10,2),
  estimated_qty   INTEGER,

  -- Services
  want_photos     BOOLEAN DEFAULT true,
  want_certif     BOOLEAN DEFAULT true,
  want_inventory  BOOLEAN DEFAULT true,
  want_picking    BOOLEAN DEFAULT false,

  -- Livraison
  delivery_mode   VARCHAR(20) DEFAULT 'self'
                  CHECK (delivery_mode IN ('self','revex','transporter')),
  delivery_date   DATE,
  delivery_notes  TEXT,

  -- Admin
  admin_notes     TEXT,
  estimated_revenue DECIMAL(10,2),
  warehouse_id    VARCHAR(50),

  -- Timestamps
  created_at      TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at      TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  confirmed_at    TIMESTAMP WITH TIME ZONE,
  activated_at    TIMESTAMP WITH TIME ZONE,
  completed_at    TIMESTAMP WITH TIME ZONE
);

CREATE INDEX IF NOT EXISTS idx_storage_requests_seller   ON storage_requests(seller_id);
CREATE INDEX IF NOT EXISTS idx_storage_requests_status   ON storage_requests(status);
CREATE INDEX IF NOT EXISTS idx_storage_requests_created  ON storage_requests(created_at DESC);

-- Trigger updated_at
CREATE OR REPLACE FUNCTION update_storage_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS storage_requests_updated_at ON storage_requests;
CREATE TRIGGER storage_requests_updated_at
  BEFORE UPDATE ON storage_requests
  FOR EACH ROW EXECUTE FUNCTION update_storage_updated_at();
