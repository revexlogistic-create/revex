-- Patch: rendre order_id optionnel + ajouter notes + seller_id optionnel
ALTER TABLE transport_bookings ALTER COLUMN order_id  DROP NOT NULL;
ALTER TABLE transport_bookings ALTER COLUMN seller_id DROP NOT NULL;
ALTER TABLE transport_bookings ADD COLUMN IF NOT EXISTS notes TEXT;
ALTER TABLE transport_bookings ADD COLUMN IF NOT EXISTS confirmed_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE transports ADD COLUMN IF NOT EXISTS contact_phone VARCHAR(30);
ALTER TABLE transports ADD COLUMN IF NOT EXISTS booked_capacity_tons DECIMAL(10,2) DEFAULT 0;
