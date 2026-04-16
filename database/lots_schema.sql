-- ============================================================
-- REVEX — Système de lots (recyclage, DIY, industriel)
-- ============================================================

-- ── Types ENUM ───────────────────────────────────────────────
CREATE TYPE lot_type AS ENUM (
  'recyclage',   -- Recyclage matière première
  'diy',         -- Make It Yourself / collection créative
  'industriel'   -- Pièces utilisables par catégorie industrie
);

CREATE TYPE lot_sale_type AS ENUM (
  'fixed_price', -- Prix fixe
  'auction'      -- Enchères
);

CREATE TYPE lot_status AS ENUM (
  'draft', 'active', 'auction_live', 'sold', 'cancelled', 'expired'
);

-- ── TABLE : lots ─────────────────────────────────────────────
CREATE TABLE lots (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  seller_id       UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  -- Identification
  title           VARCHAR(300) NOT NULL,
  slug            VARCHAR(350) UNIQUE NOT NULL,
  description     TEXT,
  lot_type        lot_type NOT NULL,
  sale_type       lot_sale_type NOT NULL DEFAULT 'fixed_price',
  industry_category VARCHAR(100), -- pour type 'industriel'

  -- Prix (fixe)
  price           DECIMAL(12,2),
  negotiable      BOOLEAN DEFAULT TRUE,

  -- Enchères
  start_price     DECIMAL(12,2),  -- prix de départ
  reserve_price   DECIMAL(12,2),  -- prix de réserve (non publié)
  current_bid     DECIMAL(12,2),  -- meilleure offre actuelle
  bid_increment   DECIMAL(10,2) DEFAULT 100, -- palier minimum
  auction_start   TIMESTAMP WITH TIME ZONE,
  auction_end     TIMESTAMP WITH TIME ZONE,
  auction_winner_id UUID REFERENCES users(id),

  -- Infos lot
  total_weight_kg DECIMAL(10,2),
  total_value_est DECIMAL(12,2),  -- valeur estimée totale
  nb_items        INTEGER DEFAULT 0,
  images          JSONB DEFAULT '[]',
  location_city   VARCHAR(100),
  condition       VARCHAR(30) DEFAULT 'mixed', -- new/good/used/mixed

  -- Statut
  status          lot_status DEFAULT 'draft',
  views_count     INTEGER DEFAULT 0,
  watchers_count  INTEGER DEFAULT 0,

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  published_at TIMESTAMP WITH TIME ZONE,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_lots_seller   ON lots(seller_id);
CREATE INDEX idx_lots_type     ON lots(lot_type);
CREATE INDEX idx_lots_status   ON lots(status);
CREATE INDEX idx_lots_end      ON lots(auction_end);
CREATE INDEX idx_lots_slug     ON lots(slug);

-- ── TABLE : lot_items (articles dans un lot) ──────────────────
CREATE TABLE lot_items (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  lot_id      UUID NOT NULL REFERENCES lots(id) ON DELETE CASCADE,
  product_id  UUID REFERENCES products(id) ON DELETE SET NULL, -- optionnel (lien PDR)
  reference   VARCHAR(100),
  designation VARCHAR(300) NOT NULL,
  quantity    INTEGER DEFAULT 1,
  unit        VARCHAR(30) DEFAULT 'unité',
  unit_weight_kg DECIMAL(8,2),
  condition   VARCHAR(30) DEFAULT 'used',
  notes       TEXT,
  sort_order  INTEGER DEFAULT 0
);

CREATE INDEX idx_lot_items_lot     ON lot_items(lot_id);
CREATE INDEX idx_lot_items_product ON lot_items(product_id);

-- ── TABLE : auction_bids (enchères) ──────────────────────────
CREATE TABLE auction_bids (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  lot_id      UUID NOT NULL REFERENCES lots(id) ON DELETE CASCADE,
  bidder_id   UUID NOT NULL REFERENCES users(id),
  amount      DECIMAL(12,2) NOT NULL,
  is_winning  BOOLEAN DEFAULT FALSE,
  is_auto_bid BOOLEAN DEFAULT FALSE,  -- enchère automatique
  created_at  TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_bids_lot    ON auction_bids(lot_id);
CREATE INDEX idx_bids_bidder ON auction_bids(bidder_id);
CREATE INDEX idx_bids_amount ON auction_bids(lot_id, amount DESC);

-- ── TABLE : lot_watchers (surveillance d'un lot) ─────────────
CREATE TABLE lot_watchers (
  lot_id      UUID REFERENCES lots(id) ON DELETE CASCADE,
  user_id     UUID REFERENCES users(id) ON DELETE CASCADE,
  created_at  TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  PRIMARY KEY (lot_id, user_id)
);
