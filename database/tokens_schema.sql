-- ============================================================
-- REVEX — Système de jetons (monétisation)
-- ============================================================

-- Ajouter la balance de jetons aux utilisateurs
ALTER TABLE users ADD COLUMN IF NOT EXISTS tokens_balance INTEGER NOT NULL DEFAULT 0;

-- Offrir des jetons de bienvenue aux comptes existants
UPDATE users SET tokens_balance = 50 WHERE tokens_balance = 0 AND status = 'active';

-- Table des transactions de jetons
CREATE TABLE IF NOT EXISTS token_transactions (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id      UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type         VARCHAR(30) NOT NULL, -- 'debit' | 'credit'
  operation    VARCHAR(60) NOT NULL, -- 'publish_product', 'send_quote', etc.
  amount       INTEGER NOT NULL,     -- positif (crédit) ou négatif (débit)
  balance_after INTEGER NOT NULL,
  description  TEXT,
  ref_id       UUID,                 -- ID produit/commande/devis lié
  created_at   TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_token_tx_user ON token_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_token_tx_date ON token_transactions(created_at DESC);

-- Table des forfaits de jetons
CREATE TABLE IF NOT EXISTS token_packages (
  id          SERIAL PRIMARY KEY,
  name        VARCHAR(100) NOT NULL,
  tokens      INTEGER NOT NULL,
  price_mad   DECIMAL(10,2) NOT NULL,
  bonus_pct   INTEGER DEFAULT 0, -- % bonus (ex: 20 = 20% de jetons en plus)
  is_popular  BOOLEAN DEFAULT FALSE,
  is_active   BOOLEAN DEFAULT TRUE,
  created_at  TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Forfaits par défaut
INSERT INTO token_packages (name, tokens, price_mad, bonus_pct, is_popular) VALUES
  ('Démarrage',   50,   99,   0,  false),
  ('Business',   200,  299,  10,  true ),
  ('Premium',    500,  599,  25,  false),
  ('Enterprise',1000,  999,  50,  false)
ON CONFLICT DO NOTHING;
