-- ============================================================
-- REVEX — SCHEMA EXTENSION (Processus de vente complet)
-- À exécuter APRÈS schema.sql
-- Intègre : qualification, Trust Score, escrow, litiges, SLA
-- ============================================================

-- ── 1. QUALIFICATION VENDEURS ────────────────────────────────
-- Étapes de vérification juridique et conformité

CREATE TABLE seller_qualifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  seller_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  -- Étape 1 : Vérification juridique
  rc_verified BOOLEAN DEFAULT FALSE,
  ice_verified BOOLEAN DEFAULT FALSE,
  identity_verified BOOLEAN DEFAULT FALSE,
  rc_document_url VARCHAR(500),
  ice_document_url VARCHAR(500),
  identity_document_url VARCHAR(500),

  -- Étape 2 : Classification du stock
  stock_classification VARCHAR(50),  -- 'spare_parts', 'equipment', 'raw_material', 'consumable'
  stock_criticality VARCHAR(30),     -- 'critical', 'standard', 'low'
  stock_rotation VARCHAR(30),        -- 'fast', 'medium', 'slow', 'dormant'

  -- Étape 3 : Engagements
  compliance_signed BOOLEAN DEFAULT FALSE,
  quality_signed BOOLEAN DEFAULT FALSE,
  signed_at TIMESTAMP WITH TIME ZONE,
  signature_document_url VARCHAR(500),

  -- Statut global
  status VARCHAR(30) DEFAULT 'pending',  -- pending, in_review, approved, rejected
  reviewed_by UUID REFERENCES users(id),
  review_notes TEXT,
  approved_at TIMESTAMP WITH TIME ZONE,

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE UNIQUE INDEX idx_seller_qual_unique ON seller_qualifications(seller_id);

-- ── 2. CLASSIFICATION QUALITÉ DES PIÈCES ─────────────────────
-- A+, A, B, C, D — + Certification REVEX optionnelle

ALTER TABLE products
  ADD COLUMN IF NOT EXISTS quality_grade VARCHAR(5) DEFAULT NULL,
    -- A+ = Neuf certifié, A = Neuf non certifié, B = Bon état, C = Usagé fonctionnel, D = Pour pièces
  ADD COLUMN IF NOT EXISTS revex_certified BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS certification_date TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS certification_ref VARCHAR(100),
  ADD COLUMN IF NOT EXISTS trust_score INTEGER DEFAULT 0 CHECK (trust_score BETWEEN 0 AND 100),
  ADD COLUMN IF NOT EXISTS technical_sheet_url VARCHAR(500),
  ADD COLUMN IF NOT EXISTS compatibility_notes TEXT,
  ADD COLUMN IF NOT EXISTS warranty_months INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS sla_available BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS urgent_mode BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS escrow_enabled BOOLEAN DEFAULT TRUE;

-- ── 3. SCORING DE CONFIANCE (Trust Score) ────────────────────
CREATE TABLE trust_score_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  entity_type VARCHAR(20) NOT NULL, -- 'product' | 'seller'
  entity_id UUID NOT NULL,
  factor VARCHAR(100) NOT NULL,   -- Ex : 'seller_verified', 'has_technical_sheet', 'revex_certified'
  points INTEGER NOT NULL,        -- Positif ou négatif
  note TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_trust_entity ON trust_score_logs(entity_type, entity_id);

-- ── 4. ESCROW (Paiement sécurisé) ────────────────────────────
CREATE TYPE escrow_status AS ENUM ('held', 'released', 'refunded', 'disputed');

CREATE TABLE escrow_transactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  amount DECIMAL(14,2) NOT NULL,
  currency VARCHAR(10) DEFAULT 'MAD',
  status escrow_status DEFAULT 'held',
  held_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  release_trigger VARCHAR(50),   -- 'buyer_confirmed' | 'auto_7days' | 'admin_forced'
  released_at TIMESTAMP WITH TIME ZONE,
  refunded_at TIMESTAMP WITH TIME ZONE,
  payment_ref VARCHAR(255),
  payment_method VARCHAR(50),    -- 'bank_transfer', 'card', 'simulated'
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_escrow_order ON escrow_transactions(order_id);
CREATE INDEX idx_escrow_status ON escrow_transactions(status);

-- ── 5. LITIGES ────────────────────────────────────────────────
CREATE TYPE dispute_status AS ENUM ('open', 'under_review', 'resolved_buyer', 'resolved_seller', 'closed');
CREATE TYPE dispute_reason AS ENUM ('not_as_described', 'not_received', 'damaged', 'wrong_item', 'other');

CREATE TABLE disputes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id UUID NOT NULL REFERENCES orders(id),
  escrow_id UUID REFERENCES escrow_transactions(id),
  opened_by UUID NOT NULL REFERENCES users(id),
  seller_id UUID NOT NULL REFERENCES users(id),
  buyer_id UUID NOT NULL REFERENCES users(id),

  reason dispute_reason NOT NULL,
  description TEXT NOT NULL,
  evidence_urls JSONB DEFAULT '[]',   -- Photos, documents

  status dispute_status DEFAULT 'open',
  admin_notes TEXT,
  resolution TEXT,
  resolved_by UUID REFERENCES users(id),
  resolved_at TIMESTAMP WITH TIME ZONE,

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_disputes_order ON disputes(order_id);
CREATE INDEX idx_disputes_status ON disputes(status);

-- ── 6. CERTIFICAT DIGITAL DE TRAÇABILITÉ ─────────────────────
CREATE TABLE traceability_certificates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  certificate_ref VARCHAR(100) UNIQUE NOT NULL,  -- Ex: REVEX-CERT-2024-00042
  product_id UUID NOT NULL REFERENCES products(id),
  order_id UUID REFERENCES orders(id),
  seller_id UUID NOT NULL REFERENCES users(id),
  buyer_id UUID REFERENCES users(id),

  -- Données traçabilité
  product_title VARCHAR(300),
  product_reference VARCHAR(100),
  quality_grade VARCHAR(5),
  condition VARCHAR(30),
  quantity INTEGER,
  inspection_date TIMESTAMP WITH TIME ZONE,
  inspector_name VARCHAR(200),

  -- Historique de la pièce
  manufacturing_year INTEGER,
  original_manufacturer VARCHAR(200),
  usage_history TEXT,
  last_maintenance_date DATE,
  maintenance_records JSONB DEFAULT '[]',

  -- Certif REVEX
  revex_validated BOOLEAN DEFAULT FALSE,
  validated_by UUID REFERENCES users(id),
  validation_notes TEXT,

  -- QR Code / Hash pour vérification
  verification_hash VARCHAR(255) UNIQUE,
  qr_code_url VARCHAR(500),
  pdf_url VARCHAR(500),

  issued_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  expires_at TIMESTAMP WITH TIME ZONE,
  is_valid BOOLEAN DEFAULT TRUE
);

CREATE INDEX idx_cert_product ON traceability_certificates(product_id);
CREATE INDEX idx_cert_ref ON traceability_certificates(certificate_ref);
CREATE INDEX idx_cert_hash ON traceability_certificates(verification_hash);

-- ── 7. SLA INDUSTRIEL ─────────────────────────────────────────
CREATE TABLE sla_contracts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  seller_id UUID NOT NULL REFERENCES users(id),
  buyer_id UUID REFERENCES users(id),  -- NULL = offre générale

  name VARCHAR(200) NOT NULL,
  response_time_hours INTEGER DEFAULT 4,     -- Délai réponse max
  delivery_guarantee_days INTEGER DEFAULT 5, -- Délai livraison garanti
  availability_rate DECIMAL(5,2) DEFAULT 99.00, -- % dispo pièce
  replacement_policy TEXT,
  price_per_year DECIMAL(12,2),
  is_active BOOLEAN DEFAULT TRUE,

  started_at DATE,
  expires_at DATE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ── 8. MODE URGENCE MAINTENANCE ──────────────────────────────
CREATE TABLE urgent_requests (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  buyer_id UUID NOT NULL REFERENCES users(id),
  product_id UUID REFERENCES products(id),  -- NULL si recherche ouverte

  -- Description besoin urgent
  part_reference VARCHAR(200),
  part_description TEXT,
  equipment_model VARCHAR(200),
  urgency_level VARCHAR(20) DEFAULT 'high',   -- 'critical', 'high', 'medium'
  max_delivery_hours INTEGER DEFAULT 48,
  max_budget DECIMAL(12,2),
  location_city VARCHAR(100),
  location_region VARCHAR(100),

  -- Statut
  status VARCHAR(30) DEFAULT 'open',  -- open, matched, fulfilled, cancelled
  matched_product_id UUID REFERENCES products(id),
  matched_seller_id UUID REFERENCES users(id),

  expires_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() + INTERVAL '72 hours',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_urgent_buyer ON urgent_requests(buyer_id);
CREATE INDEX idx_urgent_status ON urgent_requests(status);
CREATE INDEX idx_urgent_expires ON urgent_requests(expires_at);

-- ── 9. ENRICHISSEMENT AUTO & SUGGESTION PRIX ─────────────────
CREATE TABLE price_suggestions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  suggested_price DECIMAL(12,2) NOT NULL,
  min_price DECIMAL(12,2),
  max_price DECIMAL(12,2),
  confidence_score DECIMAL(4,2),  -- 0.00 à 1.00
  based_on_count INTEGER,         -- Nb de références marché utilisées
  algorithm VARCHAR(50) DEFAULT 'market_comparison',
  accepted BOOLEAN,               -- Le vendeur a-t-il accepté ?
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ── 10. TRIGGER : Trust Score auto ───────────────────────────
-- Calcule et met à jour le trust_score des produits

CREATE OR REPLACE FUNCTION compute_product_trust_score(p_id UUID)
RETURNS INTEGER AS $$
DECLARE
  score INTEGER := 0;
  rec RECORD;
BEGIN
  SELECT
    p.images, p.technical_sheet_url, p.revex_certified,
    p.quality_grade, p.specifications, p.description,
    p.compatibility_notes, p.warranty_months,
    u.status AS seller_status,
    sq.status AS seller_qualification
  INTO rec
  FROM products p
  JOIN users u ON p.seller_id = u.id
  LEFT JOIN seller_qualifications sq ON sq.seller_id = u.id
  WHERE p.id = p_id;

  -- Images renseignées (+15)
  IF rec.images IS NOT NULL AND jsonb_array_length(rec.images) > 0 THEN score := score + 15; END IF;
  -- Fiche technique (+20)
  IF rec.technical_sheet_url IS NOT NULL THEN score := score + 20; END IF;
  -- Certifié REVEX (+25)
  IF rec.revex_certified THEN score := score + 25; END IF;
  -- Grade qualité renseigné (+10)
  IF rec.quality_grade IS NOT NULL THEN score := score + 10; END IF;
  -- Spécifications détaillées (+10)
  IF rec.specifications IS NOT NULL AND rec.specifications != '{}' THEN score := score + 10; END IF;
  -- Description complète (+5)
  IF rec.description IS NOT NULL AND length(rec.description) > 100 THEN score := score + 5; END IF;
  -- Compatibilité renseignée (+5)
  IF rec.compatibility_notes IS NOT NULL THEN score := score + 5; END IF;
  -- Vendeur qualifié (+10)
  IF rec.seller_qualification = 'approved' THEN score := score + 10; END IF;

  RETURN LEAST(score, 100);
END;
$$ LANGUAGE plpgsql;

-- Trigger sur INSERT/UPDATE produit
CREATE OR REPLACE FUNCTION trigger_update_trust_score()
RETURNS TRIGGER AS $$
BEGIN
  NEW.trust_score := compute_product_trust_score(NEW.id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_trust_score
  BEFORE INSERT OR UPDATE OF images, technical_sheet_url, revex_certified, quality_grade, specifications, description
  ON products FOR EACH ROW EXECUTE FUNCTION trigger_update_trust_score();

-- ── Données qualité dans le seed ─────────────────────────────
UPDATE products SET
  quality_grade = CASE
    WHEN condition = 'new' AND reference IS NOT NULL THEN 'A+'
    WHEN condition = 'new' THEN 'A'
    WHEN condition = 'good' THEN 'B'
    ELSE 'C'
  END,
  escrow_enabled = TRUE,
  trust_score = 75
WHERE status = 'active';

-- Qualification vendeurs démo
INSERT INTO seller_qualifications (seller_id, rc_verified, ice_verified, identity_verified, compliance_signed, quality_signed, status, approved_at)
SELECT id, TRUE, TRUE, TRUE, TRUE, TRUE, 'approved', NOW()
FROM users WHERE role = 'seller' AND status = 'active';
