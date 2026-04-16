-- Migration : table réponses aux demandes urgentes
CREATE TABLE IF NOT EXISTS urgent_responses (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id      UUID NOT NULL REFERENCES urgent_requests(id) ON DELETE CASCADE,
  seller_id       UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  product_id      UUID REFERENCES products(id) ON DELETE SET NULL,

  seller_company  VARCHAR(255),
  seller_phone    VARCHAR(30),
  seller_city     VARCHAR(100),

  message         TEXT,
  proposed_price  DECIMAL(12,2),
  delivery_hours  INTEGER,
  quantity_available INTEGER DEFAULT 1,

  status          VARCHAR(20) DEFAULT 'pending'
                  CHECK (status IN ('pending','accepted','rejected','ordered')),

  created_at      TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_urgent_resp_request ON urgent_responses(request_id);
CREATE INDEX IF NOT EXISTS idx_urgent_resp_seller  ON urgent_responses(seller_id);
CREATE INDEX IF NOT EXISTS idx_urgent_resp_status  ON urgent_responses(status);
