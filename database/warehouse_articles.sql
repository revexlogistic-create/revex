-- warehouse_articles : articles stockés physiquement dans un entrepôt REVEX
-- Un article peut être stocké même s'il est déjà publié sur le catalogue

CREATE TABLE IF NOT EXISTS warehouse_articles (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  warehouse_id    VARCHAR(20) NOT NULL REFERENCES warehouses(id) ON DELETE CASCADE,
  storage_request_id UUID REFERENCES storage_requests(id) ON DELETE SET NULL,

  -- Identification de l'article
  product_id      UUID REFERENCES products(id) ON DELETE SET NULL,
  title           VARCHAR(500) NOT NULL,
  reference       VARCHAR(200),
  category        VARCHAR(200),
  quality_grade   VARCHAR(5),
  quantity        INTEGER NOT NULL DEFAULT 1,
  unit            VARCHAR(20) DEFAULT 'u.',
  unit_price      DECIMAL(12,2),

  -- Dimensions physiques
  weight_kg       DECIMAL(10,2),
  volume_m3       DECIMAL(10,4),
  dimensions      VARCHAR(100),

  -- Localisation dans l'entrepôt
  zone            VARCHAR(50),   -- ex: Zone A, Allée 3
  shelf           VARCHAR(50),   -- ex: Étagère B-12
  position        VARCHAR(100),  -- description libre

  -- État et statut
  status          VARCHAR(30) DEFAULT 'en_stock'
                  CHECK (status IN ('en_stock','reserve','expedie','sorti','perdu')),
  condition_notes TEXT,

  -- Vendeur propriétaire
  seller_id       UUID REFERENCES users(id) ON DELETE SET NULL,
  seller_company  VARCHAR(200),

  -- Dates
  entree_date     DATE NOT NULL DEFAULT CURRENT_DATE,
  sortie_date     DATE,
  created_at      TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at      TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_wa_warehouse  ON warehouse_articles(warehouse_id);
CREATE INDEX IF NOT EXISTS idx_wa_status     ON warehouse_articles(status);
CREATE INDEX IF NOT EXISTS idx_wa_request    ON warehouse_articles(storage_request_id);
CREATE INDEX IF NOT EXISTS idx_wa_product    ON warehouse_articles(product_id);
CREATE INDEX IF NOT EXISTS idx_wa_seller     ON warehouse_articles(seller_id);

-- Trigger updated_at
CREATE OR REPLACE FUNCTION update_wa_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS wa_updated_at ON warehouse_articles;
CREATE TRIGGER wa_updated_at
  BEFORE UPDATE ON warehouse_articles
  FOR EACH ROW EXECUTE FUNCTION update_wa_updated_at();
