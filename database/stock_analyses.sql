-- stock_analyses table
CREATE TABLE IF NOT EXISTS stock_analyses (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id          UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  filename            VARCHAR(300),
  plan                VARCHAR(20) DEFAULT 'free',
  status              VARCHAR(20) DEFAULT 'completed',
  total_refs          INTEGER DEFAULT 0,
  dormant_count       INTEGER DEFAULT 0,
  dormant_value       DECIMAL(14,2) DEFAULT 0,
  dormant_percentage  VARCHAR(10),
  analysis_result     JSONB,
  created_at          TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  completed_at        TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_stock_analyses_company ON stock_analyses(company_id);
CREATE INDEX IF NOT EXISTS idx_stock_analyses_created ON stock_analyses(created_at DESC);
