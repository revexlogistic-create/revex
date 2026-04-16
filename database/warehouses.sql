-- warehouses table
CREATE TABLE IF NOT EXISTS warehouses (
  id            VARCHAR(20) PRIMARY KEY,
  name          VARCHAR(200) NOT NULL,
  city          VARCHAR(100) NOT NULL,
  address       TEXT,
  capacity      DECIMAL(10,2) NOT NULL DEFAULT 200,
  used          DECIMAL(10,2) NOT NULL DEFAULT 0,
  surface       DECIMAL(10,2) DEFAULT 0,
  status        VARCHAR(30) NOT NULL DEFAULT 'actif'
                CHECK (status IN ('actif','inactif','maintenance','ouverture prévue')),
  type          VARCHAR(50) DEFAULT 'Industriel',
  responsable   VARCHAR(200),
  phone         VARCHAR(50),
  ouverture     VARCHAR(100) DEFAULT 'Lun-Sam 8h-17h',
  notes         TEXT,
  created_at    TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at    TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index
CREATE INDEX IF NOT EXISTS idx_warehouses_status ON warehouses(status);

-- Trigger updated_at
CREATE OR REPLACE FUNCTION update_warehouses_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS warehouses_updated_at ON warehouses;
CREATE TRIGGER warehouses_updated_at
  BEFORE UPDATE ON warehouses
  FOR EACH ROW EXECUTE FUNCTION update_warehouses_updated_at();

-- Seed initial data
INSERT INTO warehouses (id, name, city, address, capacity, used, surface, status, type, responsable, phone, ouverture, notes)
VALUES
  ('WH-01','Entrepôt Ain Sebaâ','Casablanca','Zone Industrielle Ain Sebaâ, Casablanca',500,280,800,'actif','Industriel','Karim Bensouda','+212 661 111 222','Lun-Sam 8h-17h','Rampe de chargement · Pont roulant 5T'),
  ('WH-02','Entrepôt Jorf Lasfar','El Jadida','Zone Industrielle Jorf Lasfar, El Jadida',300,120,500,'actif','Industriel','Samira Alaoui','+212 662 222 333','Lun-Ven 8h-17h','Proximité OCP · Accès camions 40T'),
  ('WH-03','Zone Industrielle Kénitra','Kénitra','Zone Industrielle Kénitra Nord',200,0,300,'ouverture prévue','Polyvalent','—','—','À définir','Ouverture prévue T2 2025')
ON CONFLICT (id) DO NOTHING;

-- Also add warehouse_id FK reference to storage_requests if not already there
ALTER TABLE storage_requests
  ADD COLUMN IF NOT EXISTS warehouse_id VARCHAR(20) REFERENCES warehouses(id) ON DELETE SET NULL;
