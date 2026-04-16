-- ============================================================
-- REVEX MARKETPLACE — SCHÉMA POSTGRESQL
-- Version 1.0 | Base de données B2B Stock Dormant Industriel
-- ============================================================

-- Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm"; -- Pour la recherche full-text

-- ============================================================
-- ENUM TYPES
-- ============================================================
CREATE TYPE user_role AS ENUM ('admin', 'seller', 'buyer', 'distributor');
CREATE TYPE user_status AS ENUM ('pending', 'active', 'suspended');
CREATE TYPE product_status AS ENUM ('draft', 'active', 'sold', 'archived');
CREATE TYPE product_condition AS ENUM ('new', 'good', 'used');
CREATE TYPE delivery_type AS ENUM ('eco', 'urgent', 'both');
CREATE TYPE order_status AS ENUM ('pending', 'confirmed', 'shipped', 'delivered', 'cancelled', 'refunded');
CREATE TYPE quote_status AS ENUM ('pending', 'accepted', 'rejected', 'expired');
CREATE TYPE message_type AS ENUM ('text', 'quote_request', 'order_update', 'system');

-- ============================================================
-- TABLE: users
-- ============================================================
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  role user_role NOT NULL DEFAULT 'buyer',
  status user_status NOT NULL DEFAULT 'pending',

  -- Infos entreprise
  company_name VARCHAR(255) NOT NULL,
  contact_name VARCHAR(255) NOT NULL,
  phone VARCHAR(30),
  city VARCHAR(100),
  region VARCHAR(100),
  country VARCHAR(100) DEFAULT 'Maroc',
  address TEXT,
  ice_number VARCHAR(50),  -- Identifiant Commun de l'Entreprise (Maroc)
  rc_number VARCHAR(50),   -- Registre de Commerce
  sector VARCHAR(100),     -- Secteur industriel

  -- Avatar / logo
  avatar_url VARCHAR(500),

  -- Stats (dénormalisées pour performance)
  total_sales INTEGER DEFAULT 0,
  total_purchases INTEGER DEFAULT 0,
  rating DECIMAL(3,2) DEFAULT 0.00,
  reviews_count INTEGER DEFAULT 0,

  -- Tokens
  refresh_token TEXT,
  reset_token VARCHAR(255),
  reset_token_expires TIMESTAMP,
  email_verified BOOLEAN DEFAULT FALSE,
  email_verify_token VARCHAR(255),

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_users_city ON users(city);
CREATE INDEX idx_users_sector ON users(sector);

-- ============================================================
-- TABLE: categories
-- ============================================================
CREATE TABLE categories (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  slug VARCHAR(100) UNIQUE NOT NULL,
  parent_id INTEGER REFERENCES categories(id) ON DELETE SET NULL,
  icon VARCHAR(50),
  description TEXT,
  product_count INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT TRUE,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_categories_parent ON categories(parent_id);
CREATE INDEX idx_categories_slug ON categories(slug);

-- ============================================================
-- TABLE: products (Stock Dormant PDR)
-- ============================================================
CREATE TABLE products (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  seller_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  category_id INTEGER REFERENCES categories(id) ON DELETE SET NULL,

  -- Identification
  title VARCHAR(300) NOT NULL,
  slug VARCHAR(350) UNIQUE NOT NULL,
  reference VARCHAR(100),
  brand VARCHAR(100),
  model VARCHAR(100),

  -- Description
  description TEXT,
  specifications JSONB DEFAULT '{}',  -- Specs techniques flexibles

  -- Stock & Prix
  condition product_condition NOT NULL DEFAULT 'new',
  quantity INTEGER NOT NULL DEFAULT 1,
  unit VARCHAR(30) DEFAULT 'unité',
  price DECIMAL(12,2) NOT NULL,
  min_order_qty INTEGER DEFAULT 1,
  negotiable BOOLEAN DEFAULT TRUE,
  price_on_request BOOLEAN DEFAULT FALSE,

  -- Logistique
  weight_kg DECIMAL(8,2),
  dimensions JSONB DEFAULT '{}', -- {length, width, height}
  location_city VARCHAR(100),
  location_region VARCHAR(100),
  delivery_type delivery_type DEFAULT 'both',
  eco_delivery_price DECIMAL(10,2),
  urgent_delivery_price DECIMAL(10,2),
  delivery_days_eco INTEGER,
  delivery_days_urgent INTEGER,

  -- Médias
  images JSONB DEFAULT '[]',  -- Array d'URLs
  documents JSONB DEFAULT '[]', -- Fiches techniques, etc.

  -- Statut & Visibilité
  status product_status DEFAULT 'draft',
  is_featured BOOLEAN DEFAULT FALSE,
  is_urgent_sale BOOLEAN DEFAULT FALSE,
  dormant_since DATE,  -- Depuis quand la pièce est dormante

  -- SEO
  meta_title VARCHAR(300),
  meta_description VARCHAR(500),
  tags TEXT[],

  -- Stats
  views_count INTEGER DEFAULT 0,
  favorites_count INTEGER DEFAULT 0,
  inquiries_count INTEGER DEFAULT 0,

  -- Analyse (pour le service d'analyse stock)
  stock_analysis_id UUID,  -- Lien vers l'analyse d'origine

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  published_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX idx_products_seller ON products(seller_id);
CREATE INDEX idx_products_category ON products(category_id);
CREATE INDEX idx_products_status ON products(status);
CREATE INDEX idx_products_condition ON products(condition);
CREATE INDEX idx_products_city ON products(location_city);
CREATE INDEX idx_products_price ON products(price);
CREATE INDEX idx_products_created ON products(created_at DESC);
CREATE INDEX idx_products_title_trgm ON products USING gin(title gin_trgm_ops);
CREATE INDEX idx_products_tags ON products USING gin(tags);

-- ============================================================
-- TABLE: product_favorites
-- ============================================================
CREATE TABLE product_favorites (
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  product_id UUID REFERENCES products(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  PRIMARY KEY (user_id, product_id)
);

-- ============================================================
-- TABLE: orders
-- ============================================================
CREATE TABLE orders (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_number VARCHAR(50) UNIQUE NOT NULL,
  buyer_id UUID NOT NULL REFERENCES users(id),
  seller_id UUID NOT NULL REFERENCES users(id),
  product_id UUID NOT NULL REFERENCES products(id),

  -- Détails commande
  quantity INTEGER NOT NULL,
  unit_price DECIMAL(12,2) NOT NULL,
  total_price DECIMAL(12,2) NOT NULL,
  delivery_type VARCHAR(20) NOT NULL DEFAULT 'eco',
  delivery_price DECIMAL(10,2) DEFAULT 0,
  final_price DECIMAL(12,2) NOT NULL,

  -- Adresse livraison
  delivery_address JSONB DEFAULT '{}',

  -- Statut
  status order_status DEFAULT 'pending',
  notes TEXT,

  -- Paiement (simulé pour MVP)
  payment_method VARCHAR(50),
  payment_status VARCHAR(50) DEFAULT 'pending',
  payment_ref VARCHAR(255),

  -- Timestamps de suivi
  confirmed_at TIMESTAMP WITH TIME ZONE,
  shipped_at TIMESTAMP WITH TIME ZONE,
  delivered_at TIMESTAMP WITH TIME ZONE,
  cancelled_at TIMESTAMP WITH TIME ZONE,
  cancel_reason TEXT,

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_orders_buyer ON orders(buyer_id);
CREATE INDEX idx_orders_seller ON orders(seller_id);
CREATE INDEX idx_orders_product ON orders(product_id);
CREATE INDEX idx_orders_status ON orders(status);
CREATE INDEX idx_orders_number ON orders(order_number);

-- ============================================================
-- TABLE: quotes (Demandes de devis)
-- ============================================================
CREATE TABLE quotes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  buyer_id UUID NOT NULL REFERENCES users(id),
  seller_id UUID NOT NULL REFERENCES users(id),

  quantity INTEGER NOT NULL,
  proposed_price DECIMAL(12,2),
  message TEXT,
  delivery_type VARCHAR(20),
  status quote_status DEFAULT 'pending',

  seller_response TEXT,
  counter_price DECIMAL(12,2),
  expires_at TIMESTAMP WITH TIME ZONE,

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_quotes_product ON quotes(product_id);
CREATE INDEX idx_quotes_buyer ON quotes(buyer_id);
CREATE INDEX idx_quotes_seller ON quotes(seller_id);
CREATE INDEX idx_quotes_status ON quotes(status);

-- ============================================================
-- TABLE: conversations (Messagerie B2B)
-- ============================================================
CREATE TABLE conversations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  participant_1 UUID NOT NULL REFERENCES users(id),
  participant_2 UUID NOT NULL REFERENCES users(id),
  product_id UUID REFERENCES products(id) ON DELETE SET NULL,
  last_message_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(participant_1, participant_2, product_id)
);

CREATE INDEX idx_conv_p1 ON conversations(participant_1);
CREATE INDEX idx_conv_p2 ON conversations(participant_2);

-- ============================================================
-- TABLE: messages
-- ============================================================
CREATE TABLE messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES users(id),
  type message_type DEFAULT 'text',
  content TEXT NOT NULL,
  metadata JSONB DEFAULT '{}',  -- Pour les messages type quote/system
  is_read BOOLEAN DEFAULT FALSE,
  read_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_messages_conv ON messages(conversation_id);
CREATE INDEX idx_messages_sender ON messages(sender_id);
CREATE INDEX idx_messages_unread ON messages(is_read) WHERE is_read = FALSE;

-- ============================================================
-- TABLE: reviews
-- ============================================================
CREATE TABLE reviews (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  reviewer_id UUID NOT NULL REFERENCES users(id),
  reviewed_id UUID NOT NULL REFERENCES users(id),
  order_id UUID REFERENCES orders(id),
  rating INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
  title VARCHAR(200),
  comment TEXT,
  is_verified BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_reviews_reviewed ON reviews(reviewed_id);
CREATE INDEX idx_reviews_order ON reviews(order_id);

-- ============================================================
-- TABLE: stock_analyses (Service d'analyse stock dormant)
-- ============================================================
CREATE TABLE stock_analyses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  filename VARCHAR(255),
  status VARCHAR(30) DEFAULT 'processing',
  plan VARCHAR(30) DEFAULT 'free',

  -- Résultats
  total_refs INTEGER DEFAULT 0,
  dormant_count INTEGER DEFAULT 0,
  dormant_value DECIMAL(14,2) DEFAULT 0,
  dormant_percentage DECIMAL(5,2) DEFAULT 0,

  -- Données détaillées (JSON)
  analysis_result JSONB DEFAULT '{}',

  published_count INTEGER DEFAULT 0,
  completed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================
-- TABLE: transports (Retours à vide)
-- ============================================================
CREATE TABLE transports (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  carrier_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  departure_city VARCHAR(100) NOT NULL,
  departure_region VARCHAR(100),
  arrival_city VARCHAR(100) NOT NULL,
  arrival_region VARCHAR(100),
  departure_date DATE NOT NULL,
  vehicle_type VARCHAR(50),
  capacity_tons DECIMAL(8,2),
  volume_m3 DECIMAL(8,2),
  price_per_kg DECIMAL(6,3),
  status VARCHAR(30) DEFAULT 'available',
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_transports_departure ON transports(departure_city);
CREATE INDEX idx_transports_arrival ON transports(arrival_city);
CREATE INDEX idx_transports_date ON transports(departure_date);

-- ============================================================
-- TABLE: notifications
-- ============================================================
CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type VARCHAR(50) NOT NULL,
  title VARCHAR(200) NOT NULL,
  body TEXT,
  data JSONB DEFAULT '{}',
  is_read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_notif_user ON notifications(user_id);
CREATE INDEX idx_notif_unread ON notifications(user_id, is_read) WHERE is_read = FALSE;

-- ============================================================
-- TRIGGERS : updated_at automatique
-- ============================================================
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_users_updated BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_products_updated BEFORE UPDATE ON products FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_orders_updated BEFORE UPDATE ON orders FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_quotes_updated BEFORE UPDATE ON quotes FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================
-- TRIGGER : Mise à jour product_count dans categories
-- ============================================================
CREATE OR REPLACE FUNCTION update_category_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' AND NEW.status = 'active' THEN
    UPDATE categories SET product_count = product_count + 1 WHERE id = NEW.category_id;
  ELSIF TG_OP = 'UPDATE' THEN
    IF OLD.status != 'active' AND NEW.status = 'active' THEN
      UPDATE categories SET product_count = product_count + 1 WHERE id = NEW.category_id;
    ELSIF OLD.status = 'active' AND NEW.status != 'active' THEN
      UPDATE categories SET product_count = GREATEST(product_count - 1, 0) WHERE id = NEW.category_id;
    END IF;
  ELSIF TG_OP = 'DELETE' AND OLD.status = 'active' THEN
    UPDATE categories SET product_count = GREATEST(product_count - 1, 0) WHERE id = OLD.category_id;
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_product_count AFTER INSERT OR UPDATE OR DELETE ON products FOR EACH ROW EXECUTE FUNCTION update_category_count();
