-- ============================================================
-- REVEX — Liaison livraison éco ↔ retours à vide
-- ============================================================

-- Lier une commande à un trajet transport
ALTER TABLE orders ADD COLUMN IF NOT EXISTS transport_id UUID REFERENCES transports(id) ON DELETE SET NULL;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS transport_status VARCHAR(30) DEFAULT NULL;
-- transport_status: null | 'matched' | 'confirmed_by_carrier' | 'picked_up' | 'delivered'

-- Table de réservations transport (historique)
CREATE TABLE IF NOT EXISTS transport_bookings (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id      UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  transport_id  UUID NOT NULL REFERENCES transports(id),
  carrier_id    UUID NOT NULL REFERENCES users(id),
  seller_id     UUID NOT NULL REFERENCES users(id),
  buyer_id      UUID NOT NULL REFERENCES users(id),
  pickup_city   VARCHAR(100),
  delivery_city VARCHAR(100),
  booking_price DECIMAL(10,2),
  status        VARCHAR(30) DEFAULT 'pending',
  -- pending → confirmed → picked_up → delivered → cancelled
  notes         TEXT,
  confirmed_at  TIMESTAMP WITH TIME ZONE,
  picked_up_at  TIMESTAMP WITH TIME ZONE,
  delivered_at  TIMESTAMP WITH TIME ZONE,
  created_at    TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_tb_order     ON transport_bookings(order_id);
CREATE INDEX IF NOT EXISTS idx_tb_transport ON transport_bookings(transport_id);
CREATE INDEX IF NOT EXISTS idx_tb_carrier   ON transport_bookings(carrier_id);

-- Ajouter champs utiles aux transports
ALTER TABLE transports ADD COLUMN IF NOT EXISTS booked_capacity_tons DECIMAL(8,2) DEFAULT 0;
ALTER TABLE transports ADD COLUMN IF NOT EXISTS contact_phone VARCHAR(30);
ALTER TABLE transports ADD COLUMN IF NOT EXISTS contact_name  VARCHAR(100);
