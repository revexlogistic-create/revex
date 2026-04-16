-- Exécuter dans psql : revex_db
CREATE TABLE IF NOT EXISTS service_requests (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id           UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type              VARCHAR(30) NOT NULL,
  status            VARCHAR(30) DEFAULT 'pending',

  company_name      VARCHAR(255),
  contact_name      VARCHAR(255),
  phone             VARCHAR(30),
  address           TEXT,
  city              VARCHAR(100),
  notes             TEXT,
  scheduled_date    DATE,

  stock_type        VARCHAR(100),
  quantity_tons     DECIMAL(10,2),
  duration_months   INTEGER,
  conditions        JSONB DEFAULT '{}',
  surface_m2        DECIMAL(8,2),

  nb_references_est INTEGER,
  site_access       VARCHAR(100),
  nb_staff_needed   INTEGER DEFAULT 2,
  inventory_type    VARCHAR(50),

  created_at        TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at        TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_service_user   ON service_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_service_type   ON service_requests(type);
CREATE INDEX IF NOT EXISTS idx_service_status ON service_requests(status);
