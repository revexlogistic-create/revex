--
-- PostgreSQL database dump
--

\restrict O5rGCAbJ0pOoM4zrt514vQZWFGcUwY823btj9EDm3OHxaevexdEo6WmhhEcWTnQ

-- Dumped from database version 16.13
-- Dumped by pg_dump version 16.13

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: pg_trgm; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS pg_trgm WITH SCHEMA public;


--
-- Name: EXTENSION pg_trgm; Type: COMMENT; Schema: -; Owner: 
--

COMMENT ON EXTENSION pg_trgm IS 'text similarity measurement and index searching based on trigrams';


--
-- Name: uuid-ossp; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA public;


--
-- Name: EXTENSION "uuid-ossp"; Type: COMMENT; Schema: -; Owner: 
--

COMMENT ON EXTENSION "uuid-ossp" IS 'generate universally unique identifiers (UUIDs)';


--
-- Name: delivery_type; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.delivery_type AS ENUM (
    'eco',
    'urgent',
    'both'
);


ALTER TYPE public.delivery_type OWNER TO postgres;

--
-- Name: dispute_reason; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.dispute_reason AS ENUM (
    'not_as_described',
    'not_received',
    'damaged',
    'wrong_item',
    'other'
);


ALTER TYPE public.dispute_reason OWNER TO postgres;

--
-- Name: dispute_status; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.dispute_status AS ENUM (
    'open',
    'under_review',
    'resolved_buyer',
    'resolved_seller',
    'closed'
);


ALTER TYPE public.dispute_status OWNER TO postgres;

--
-- Name: escrow_status; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.escrow_status AS ENUM (
    'held',
    'released',
    'refunded',
    'disputed'
);


ALTER TYPE public.escrow_status OWNER TO postgres;

--
-- Name: lot_sale_type; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.lot_sale_type AS ENUM (
    'fixed_price',
    'auction'
);


ALTER TYPE public.lot_sale_type OWNER TO postgres;

--
-- Name: lot_status; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.lot_status AS ENUM (
    'draft',
    'active',
    'auction_live',
    'sold',
    'cancelled',
    'expired'
);


ALTER TYPE public.lot_status OWNER TO postgres;

--
-- Name: lot_type; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.lot_type AS ENUM (
    'recyclage',
    'diy',
    'industriel'
);


ALTER TYPE public.lot_type OWNER TO postgres;

--
-- Name: message_type; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.message_type AS ENUM (
    'text',
    'quote_request',
    'order_update',
    'system'
);


ALTER TYPE public.message_type OWNER TO postgres;

--
-- Name: order_status; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.order_status AS ENUM (
    'pending',
    'confirmed',
    'shipped',
    'delivered',
    'cancelled',
    'refunded',
    'disputed'
);


ALTER TYPE public.order_status OWNER TO postgres;

--
-- Name: product_condition; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.product_condition AS ENUM (
    'new',
    'good',
    'used'
);


ALTER TYPE public.product_condition OWNER TO postgres;

--
-- Name: product_status; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.product_status AS ENUM (
    'draft',
    'active',
    'sold',
    'archived'
);


ALTER TYPE public.product_status OWNER TO postgres;

--
-- Name: quote_status; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.quote_status AS ENUM (
    'pending',
    'accepted',
    'rejected',
    'expired'
);


ALTER TYPE public.quote_status OWNER TO postgres;

--
-- Name: user_role; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.user_role AS ENUM (
    'admin',
    'seller',
    'buyer',
    'distributor',
    'acheteur_auto'
);


ALTER TYPE public.user_role OWNER TO postgres;

--
-- Name: user_status; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.user_status AS ENUM (
    'pending',
    'active',
    'suspended'
);


ALTER TYPE public.user_status OWNER TO postgres;

--
-- Name: compute_product_trust_score(uuid); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.compute_product_trust_score(p_id uuid) RETURNS integer
    LANGUAGE plpgsql
    AS $$
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

  -- Images renseignÃ©es (+15)
  IF rec.images IS NOT NULL AND jsonb_array_length(rec.images) > 0 THEN score := score + 15; END IF;
  -- Fiche technique (+20)
  IF rec.technical_sheet_url IS NOT NULL THEN score := score + 20; END IF;
  -- CertifiÃ© REVEX (+25)
  IF rec.revex_certified THEN score := score + 25; END IF;
  -- Grade qualitÃ© renseignÃ© (+10)
  IF rec.quality_grade IS NOT NULL THEN score := score + 10; END IF;
  -- SpÃ©cifications dÃ©taillÃ©es (+10)
  IF rec.specifications IS NOT NULL AND rec.specifications != '{}' THEN score := score + 10; END IF;
  -- Description complÃ¨te (+5)
  IF rec.description IS NOT NULL AND length(rec.description) > 100 THEN score := score + 5; END IF;
  -- CompatibilitÃ© renseignÃ©e (+5)
  IF rec.compatibility_notes IS NOT NULL THEN score := score + 5; END IF;
  -- Vendeur qualifiÃ© (+10)
  IF rec.seller_qualification = 'approved' THEN score := score + 10; END IF;

  RETURN LEAST(score, 100);
END;
$$;


ALTER FUNCTION public.compute_product_trust_score(p_id uuid) OWNER TO postgres;

--
-- Name: trigger_update_trust_score(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.trigger_update_trust_score() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  NEW.trust_score := compute_product_trust_score(NEW.id);
  RETURN NEW;
END;
$$;


ALTER FUNCTION public.trigger_update_trust_score() OWNER TO postgres;

--
-- Name: update_category_count(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.update_category_count() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
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
$$;


ALTER FUNCTION public.update_category_count() OWNER TO postgres;

--
-- Name: update_storage_updated_at(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.update_storage_updated_at() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;


ALTER FUNCTION public.update_storage_updated_at() OWNER TO postgres;

--
-- Name: update_updated_at(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.update_updated_at() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$;


ALTER FUNCTION public.update_updated_at() OWNER TO postgres;

--
-- Name: update_wa_updated_at(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.update_wa_updated_at() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$;


ALTER FUNCTION public.update_wa_updated_at() OWNER TO postgres;

--
-- Name: update_warehouses_updated_at(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.update_warehouses_updated_at() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$;


ALTER FUNCTION public.update_warehouses_updated_at() OWNER TO postgres;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: auction_bids; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.auction_bids (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    lot_id uuid NOT NULL,
    bidder_id uuid NOT NULL,
    amount numeric(12,2) NOT NULL,
    is_winning boolean DEFAULT false,
    is_auto_bid boolean DEFAULT false,
    created_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public.auction_bids OWNER TO postgres;

--
-- Name: categories; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.categories (
    id integer NOT NULL,
    name character varying(100) NOT NULL,
    slug character varying(100) NOT NULL,
    parent_id integer,
    icon character varying(50),
    description text,
    product_count integer DEFAULT 0,
    is_active boolean DEFAULT true,
    sort_order integer DEFAULT 0,
    created_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public.categories OWNER TO postgres;

--
-- Name: categories_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.categories_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.categories_id_seq OWNER TO postgres;

--
-- Name: categories_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.categories_id_seq OWNED BY public.categories.id;


--
-- Name: conversations; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.conversations (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    participant_1 uuid NOT NULL,
    participant_2 uuid NOT NULL,
    product_id uuid,
    last_message_at timestamp with time zone DEFAULT now(),
    created_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public.conversations OWNER TO postgres;

--
-- Name: disputes; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.disputes (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    order_id uuid NOT NULL,
    escrow_id uuid,
    opened_by uuid NOT NULL,
    seller_id uuid NOT NULL,
    buyer_id uuid NOT NULL,
    reason public.dispute_reason NOT NULL,
    description text NOT NULL,
    evidence_urls jsonb DEFAULT '[]'::jsonb,
    status public.dispute_status DEFAULT 'open'::public.dispute_status,
    admin_notes text,
    resolution text,
    resolved_by uuid,
    resolved_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    seller_response text,
    seller_evidence_urls jsonb DEFAULT '[]'::jsonb,
    seller_responded_at timestamp with time zone,
    priority character varying(20) DEFAULT 'normal'::character varying
);


ALTER TABLE public.disputes OWNER TO postgres;

--
-- Name: escrow_transactions; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.escrow_transactions (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    order_id uuid NOT NULL,
    amount numeric(14,2) NOT NULL,
    currency character varying(10) DEFAULT 'MAD'::character varying,
    status public.escrow_status DEFAULT 'held'::public.escrow_status,
    held_at timestamp with time zone DEFAULT now(),
    release_trigger character varying(50),
    released_at timestamp with time zone,
    refunded_at timestamp with time zone,
    payment_ref character varying(255),
    payment_method character varying(50),
    notes text,
    created_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public.escrow_transactions OWNER TO postgres;

--
-- Name: lot_items; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.lot_items (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    lot_id uuid NOT NULL,
    product_id uuid,
    reference character varying(100),
    designation character varying(300) NOT NULL,
    quantity integer DEFAULT 1,
    unit character varying(30) DEFAULT 'unitÃ©'::character varying,
    unit_weight_kg numeric(8,2),
    condition character varying(30) DEFAULT 'used'::character varying,
    notes text,
    sort_order integer DEFAULT 0
);


ALTER TABLE public.lot_items OWNER TO postgres;

--
-- Name: lot_watchers; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.lot_watchers (
    lot_id uuid NOT NULL,
    user_id uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public.lot_watchers OWNER TO postgres;

--
-- Name: lots; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.lots (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    seller_id uuid NOT NULL,
    title character varying(300) NOT NULL,
    slug character varying(350) NOT NULL,
    description text,
    lot_type public.lot_type NOT NULL,
    sale_type public.lot_sale_type DEFAULT 'fixed_price'::public.lot_sale_type NOT NULL,
    industry_category character varying(100),
    price numeric(12,2),
    negotiable boolean DEFAULT true,
    start_price numeric(12,2),
    reserve_price numeric(12,2),
    current_bid numeric(12,2),
    bid_increment numeric(10,2) DEFAULT 100,
    auction_start timestamp with time zone,
    auction_end timestamp with time zone,
    auction_winner_id uuid,
    total_weight_kg numeric(10,2),
    total_value_est numeric(12,2),
    nb_items integer DEFAULT 0,
    images jsonb DEFAULT '[]'::jsonb,
    location_city character varying(100),
    condition character varying(30) DEFAULT 'mixed'::character varying,
    status public.lot_status DEFAULT 'draft'::public.lot_status,
    views_count integer DEFAULT 0,
    watchers_count integer DEFAULT 0,
    created_at timestamp with time zone DEFAULT now(),
    published_at timestamp with time zone,
    updated_at timestamp with time zone DEFAULT now(),
    blind_lot boolean DEFAULT false
);


ALTER TABLE public.lots OWNER TO postgres;

--
-- Name: messages; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.messages (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    conversation_id uuid NOT NULL,
    sender_id uuid NOT NULL,
    type public.message_type DEFAULT 'text'::public.message_type,
    content text NOT NULL,
    metadata jsonb DEFAULT '{}'::jsonb,
    is_read boolean DEFAULT false,
    read_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public.messages OWNER TO postgres;

--
-- Name: notifications; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.notifications (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    user_id uuid NOT NULL,
    type character varying(50) NOT NULL,
    title character varying(200) NOT NULL,
    body text,
    data jsonb DEFAULT '{}'::jsonb,
    is_read boolean DEFAULT false,
    created_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public.notifications OWNER TO postgres;

--
-- Name: orders; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.orders (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    order_number character varying(50) NOT NULL,
    buyer_id uuid NOT NULL,
    seller_id uuid NOT NULL,
    product_id uuid NOT NULL,
    quantity integer NOT NULL,
    unit_price numeric(12,2) NOT NULL,
    total_price numeric(12,2) NOT NULL,
    delivery_type character varying(20) DEFAULT 'eco'::character varying NOT NULL,
    delivery_price numeric(10,2) DEFAULT 0,
    final_price numeric(12,2) NOT NULL,
    delivery_address jsonb DEFAULT '{}'::jsonb,
    status public.order_status DEFAULT 'pending'::public.order_status,
    notes text,
    payment_method character varying(50),
    payment_status character varying(50) DEFAULT 'pending'::character varying,
    payment_ref character varying(255),
    confirmed_at timestamp with time zone,
    shipped_at timestamp with time zone,
    delivered_at timestamp with time zone,
    cancelled_at timestamp with time zone,
    cancel_reason text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    transport_status character varying(30) DEFAULT NULL::character varying,
    status_old character varying(30)
);


ALTER TABLE public.orders OWNER TO postgres;

--
-- Name: price_suggestions; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.price_suggestions (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    product_id uuid NOT NULL,
    suggested_price numeric(12,2) NOT NULL,
    min_price numeric(12,2),
    max_price numeric(12,2),
    confidence_score numeric(4,2),
    based_on_count integer,
    algorithm character varying(50) DEFAULT 'market_comparison'::character varying,
    accepted boolean,
    created_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public.price_suggestions OWNER TO postgres;

--
-- Name: product_favorites; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.product_favorites (
    user_id uuid NOT NULL,
    product_id uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public.product_favorites OWNER TO postgres;

--
-- Name: products; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.products (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    seller_id uuid NOT NULL,
    category_id integer,
    title character varying(300) NOT NULL,
    slug character varying(350) NOT NULL,
    reference character varying(100),
    brand character varying(100),
    model character varying(100),
    description text,
    specifications jsonb DEFAULT '{}'::jsonb,
    condition public.product_condition DEFAULT 'new'::public.product_condition NOT NULL,
    quantity integer DEFAULT 1 NOT NULL,
    unit character varying(30) DEFAULT 'unitÃ©'::character varying,
    price numeric(12,2) NOT NULL,
    min_order_qty integer DEFAULT 1,
    negotiable boolean DEFAULT true,
    price_on_request boolean DEFAULT false,
    weight_kg numeric(8,2),
    dimensions jsonb DEFAULT '{}'::jsonb,
    location_city character varying(100),
    location_region character varying(100),
    delivery_type public.delivery_type DEFAULT 'both'::public.delivery_type,
    eco_delivery_price numeric(10,2),
    urgent_delivery_price numeric(10,2),
    delivery_days_eco integer,
    delivery_days_urgent integer,
    images jsonb DEFAULT '[]'::jsonb,
    documents jsonb DEFAULT '[]'::jsonb,
    status public.product_status DEFAULT 'draft'::public.product_status,
    is_featured boolean DEFAULT false,
    is_urgent_sale boolean DEFAULT false,
    dormant_since date,
    meta_title character varying(300),
    meta_description character varying(500),
    tags text[],
    views_count integer DEFAULT 0,
    favorites_count integer DEFAULT 0,
    inquiries_count integer DEFAULT 0,
    stock_analysis_id uuid,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    published_at timestamp with time zone,
    quality_grade character varying(5) DEFAULT NULL::character varying,
    revex_certified boolean DEFAULT false,
    certification_date timestamp with time zone,
    certification_ref character varying(100),
    trust_score integer DEFAULT 0,
    technical_sheet_url character varying(500),
    compatibility_notes text,
    warranty_months integer DEFAULT 0,
    sla_available boolean DEFAULT false,
    urgent_mode boolean DEFAULT false,
    escrow_enabled boolean DEFAULT true,
    is_auto boolean DEFAULT false,
    vehicle_make character varying(100),
    vehicle_model character varying(100),
    vehicle_year integer,
    CONSTRAINT products_trust_score_check CHECK (((trust_score >= 0) AND (trust_score <= 100)))
);


ALTER TABLE public.products OWNER TO postgres;

--
-- Name: quotes; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.quotes (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    product_id uuid NOT NULL,
    buyer_id uuid NOT NULL,
    seller_id uuid NOT NULL,
    quantity integer NOT NULL,
    proposed_price numeric(12,2),
    message text,
    delivery_type character varying(20),
    status public.quote_status DEFAULT 'pending'::public.quote_status,
    seller_response text,
    counter_price numeric(12,2),
    expires_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public.quotes OWNER TO postgres;

--
-- Name: reviews; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.reviews (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    reviewer_id uuid NOT NULL,
    reviewed_id uuid NOT NULL,
    order_id uuid,
    rating integer NOT NULL,
    title character varying(200),
    comment text,
    is_verified boolean DEFAULT false,
    created_at timestamp with time zone DEFAULT now(),
    CONSTRAINT reviews_rating_check CHECK (((rating >= 1) AND (rating <= 5)))
);


ALTER TABLE public.reviews OWNER TO postgres;

--
-- Name: seller_qualifications; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.seller_qualifications (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    seller_id uuid NOT NULL,
    rc_verified boolean DEFAULT false,
    ice_verified boolean DEFAULT false,
    identity_verified boolean DEFAULT false,
    rc_document_url character varying(500),
    ice_document_url character varying(500),
    identity_document_url character varying(500),
    stock_classification character varying(50),
    stock_criticality character varying(30),
    stock_rotation character varying(30),
    compliance_signed boolean DEFAULT false,
    quality_signed boolean DEFAULT false,
    signed_at timestamp with time zone,
    signature_document_url character varying(500),
    status character varying(30) DEFAULT 'pending'::character varying,
    reviewed_by uuid,
    review_notes text,
    approved_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public.seller_qualifications OWNER TO postgres;

--
-- Name: service_requests; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.service_requests (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    user_id uuid NOT NULL,
    type character varying(30) NOT NULL,
    status character varying(30) DEFAULT 'pending'::character varying,
    company_name character varying(255),
    contact_name character varying(255),
    phone character varying(30),
    address text,
    city character varying(100),
    notes text,
    scheduled_date date,
    stock_type character varying(100),
    quantity_tons numeric(10,2),
    duration_months integer,
    conditions jsonb DEFAULT '{}'::jsonb,
    surface_m2 numeric(8,2),
    nb_references_est integer,
    site_access character varying(100),
    nb_staff_needed integer DEFAULT 2,
    inventory_type character varying(50),
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public.service_requests OWNER TO postgres;

--
-- Name: sla_contracts; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.sla_contracts (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    seller_id uuid NOT NULL,
    buyer_id uuid,
    name character varying(200) NOT NULL,
    response_time_hours integer DEFAULT 4,
    delivery_guarantee_days integer DEFAULT 5,
    availability_rate numeric(5,2) DEFAULT 99.00,
    replacement_policy text,
    price_per_year numeric(12,2),
    is_active boolean DEFAULT true,
    started_at date,
    expires_at date,
    created_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public.sla_contracts OWNER TO postgres;

--
-- Name: stock_analyses; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.stock_analyses (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    company_id uuid NOT NULL,
    filename character varying(255),
    status character varying(30) DEFAULT 'processing'::character varying,
    plan character varying(30) DEFAULT 'free'::character varying,
    total_refs integer DEFAULT 0,
    dormant_count integer DEFAULT 0,
    dormant_value numeric(14,2) DEFAULT 0,
    dormant_percentage numeric(5,2) DEFAULT 0,
    analysis_result jsonb DEFAULT '{}'::jsonb,
    published_count integer DEFAULT 0,
    completed_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public.stock_analyses OWNER TO postgres;

--
-- Name: storage_requests; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.storage_requests (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    seller_id uuid NOT NULL,
    status character varying(20) DEFAULT 'pending'::character varying NOT NULL,
    contact_name character varying(200) NOT NULL,
    company_name character varying(200),
    contact_phone character varying(50) NOT NULL,
    contact_email character varying(200),
    city character varying(100) NOT NULL,
    storage_type character varying(20) DEFAULT 'long'::character varying,
    start_date date,
    selected_product_ids jsonb DEFAULT '[]'::jsonb,
    custom_items text,
    estimated_vol numeric(10,2),
    estimated_qty integer,
    want_photos boolean DEFAULT true,
    want_certif boolean DEFAULT true,
    want_inventory boolean DEFAULT true,
    want_picking boolean DEFAULT false,
    delivery_mode character varying(20) DEFAULT 'self'::character varying,
    delivery_date date,
    delivery_notes text,
    admin_notes text,
    estimated_revenue numeric(10,2),
    warehouse_id character varying(50),
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    confirmed_at timestamp with time zone,
    activated_at timestamp with time zone,
    completed_at timestamp with time zone,
    CONSTRAINT storage_requests_delivery_mode_check CHECK (((delivery_mode)::text = ANY ((ARRAY['self'::character varying, 'revex'::character varying, 'transporter'::character varying])::text[]))),
    CONSTRAINT storage_requests_status_check CHECK (((status)::text = ANY ((ARRAY['pending'::character varying, 'confirmed'::character varying, 'active'::character varying, 'completed'::character varying, 'rejected'::character varying])::text[]))),
    CONSTRAINT storage_requests_storage_type_check CHECK (((storage_type)::text = ANY ((ARRAY['court'::character varying, 'long'::character varying, 'indefini'::character varying])::text[])))
);


ALTER TABLE public.storage_requests OWNER TO postgres;

--
-- Name: token_packages; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.token_packages (
    id integer NOT NULL,
    name character varying(100) NOT NULL,
    tokens integer NOT NULL,
    price_mad numeric(10,2) NOT NULL,
    bonus_pct integer DEFAULT 0,
    is_popular boolean DEFAULT false,
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public.token_packages OWNER TO postgres;

--
-- Name: token_packages_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.token_packages_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.token_packages_id_seq OWNER TO postgres;

--
-- Name: token_packages_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.token_packages_id_seq OWNED BY public.token_packages.id;


--
-- Name: token_transactions; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.token_transactions (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    user_id uuid NOT NULL,
    type character varying(30) NOT NULL,
    operation character varying(60) NOT NULL,
    amount integer NOT NULL,
    balance_after integer NOT NULL,
    description text,
    ref_id uuid,
    created_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public.token_transactions OWNER TO postgres;

--
-- Name: traceability_certificates; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.traceability_certificates (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    certificate_ref character varying(100) NOT NULL,
    product_id uuid NOT NULL,
    order_id uuid,
    seller_id uuid NOT NULL,
    buyer_id uuid,
    product_title character varying(300),
    product_reference character varying(100),
    quality_grade character varying(5),
    condition character varying(30),
    quantity integer,
    inspection_date timestamp with time zone,
    inspector_name character varying(200),
    manufacturing_year integer,
    original_manufacturer character varying(200),
    usage_history text,
    last_maintenance_date date,
    maintenance_records jsonb DEFAULT '[]'::jsonb,
    revex_validated boolean DEFAULT false,
    validated_by uuid,
    validation_notes text,
    verification_hash character varying(255),
    qr_code_url character varying(500),
    pdf_url character varying(500),
    issued_at timestamp with time zone DEFAULT now(),
    expires_at timestamp with time zone,
    is_valid boolean DEFAULT true
);


ALTER TABLE public.traceability_certificates OWNER TO postgres;

--
-- Name: transport_bookings; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.transport_bookings (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    order_id uuid,
    transport_id uuid NOT NULL,
    carrier_id uuid NOT NULL,
    seller_id uuid,
    buyer_id uuid NOT NULL,
    pickup_city character varying(100),
    delivery_city character varying(100),
    booking_price numeric(10,2),
    status character varying(30) DEFAULT 'pending'::character varying,
    notes text,
    confirmed_at timestamp with time zone,
    picked_up_at timestamp with time zone,
    delivered_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public.transport_bookings OWNER TO postgres;

--
-- Name: transports; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.transports (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    carrier_id uuid NOT NULL,
    departure_city character varying(100) NOT NULL,
    departure_region character varying(100),
    arrival_city character varying(100) NOT NULL,
    arrival_region character varying(100),
    departure_date date NOT NULL,
    vehicle_type character varying(50),
    capacity_tons numeric(8,2),
    volume_m3 numeric(8,2),
    price_per_kg numeric(6,3),
    status character varying(30) DEFAULT 'available'::character varying,
    notes text,
    created_at timestamp with time zone DEFAULT now(),
    booked_capacity_tons numeric(8,2) DEFAULT 0,
    contact_phone character varying(30),
    contact_name character varying(100),
    vehicle_photos jsonb DEFAULT '[]'::jsonb
);


ALTER TABLE public.transports OWNER TO postgres;

--
-- Name: trust_score_logs; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.trust_score_logs (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    entity_type character varying(20) NOT NULL,
    entity_id uuid NOT NULL,
    factor character varying(100) NOT NULL,
    points integer NOT NULL,
    note text,
    created_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public.trust_score_logs OWNER TO postgres;

--
-- Name: urgent_requests; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.urgent_requests (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    buyer_id uuid NOT NULL,
    product_id uuid,
    part_reference character varying(200),
    part_description text,
    equipment_model character varying(200),
    urgency_level character varying(20) DEFAULT 'high'::character varying,
    max_delivery_hours integer DEFAULT 48,
    max_budget numeric(12,2),
    location_city character varying(100),
    location_region character varying(100),
    status character varying(30) DEFAULT 'open'::character varying,
    matched_product_id uuid,
    matched_seller_id uuid,
    expires_at timestamp with time zone DEFAULT (now() + '72:00:00'::interval),
    created_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public.urgent_requests OWNER TO postgres;

--
-- Name: users; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.users (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    email character varying(255) NOT NULL,
    password_hash character varying(255) NOT NULL,
    role public.user_role DEFAULT 'buyer'::public.user_role NOT NULL,
    status public.user_status DEFAULT 'pending'::public.user_status NOT NULL,
    company_name character varying(255) NOT NULL,
    contact_name character varying(255) NOT NULL,
    phone character varying(30),
    city character varying(100),
    region character varying(100),
    country character varying(100) DEFAULT 'Maroc'::character varying,
    address text,
    ice_number character varying(50),
    rc_number character varying(50),
    sector character varying(100),
    avatar_url character varying(500),
    total_sales integer DEFAULT 0,
    total_purchases integer DEFAULT 0,
    rating numeric(3,2) DEFAULT 0.00,
    reviews_count integer DEFAULT 0,
    refresh_token text,
    reset_token character varying(255),
    reset_token_expires timestamp without time zone,
    email_verified boolean DEFAULT false,
    email_verify_token character varying(255),
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    tokens_balance integer DEFAULT 0 NOT NULL
);


ALTER TABLE public.users OWNER TO postgres;

--
-- Name: warehouse_articles; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.warehouse_articles (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    warehouse_id character varying(20) NOT NULL,
    storage_request_id uuid,
    product_id uuid,
    title character varying(500) NOT NULL,
    reference character varying(200),
    category character varying(200),
    quality_grade character varying(5),
    quantity integer DEFAULT 1 NOT NULL,
    unit character varying(20) DEFAULT 'u.'::character varying,
    unit_price numeric(12,2),
    weight_kg numeric(10,2),
    volume_m3 numeric(10,4),
    dimensions character varying(100),
    zone character varying(50),
    shelf character varying(50),
    "position" character varying(100),
    status character varying(30) DEFAULT 'en_stock'::character varying,
    condition_notes text,
    seller_id uuid,
    seller_company character varying(200),
    entree_date date DEFAULT CURRENT_DATE NOT NULL,
    sortie_date date,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT warehouse_articles_status_check CHECK (((status)::text = ANY ((ARRAY['en_stock'::character varying, 'reserve'::character varying, 'expedie'::character varying, 'sorti'::character varying, 'perdu'::character varying])::text[])))
);


ALTER TABLE public.warehouse_articles OWNER TO postgres;

--
-- Name: warehouses; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.warehouses (
    id character varying(20) NOT NULL,
    name character varying(200) NOT NULL,
    city character varying(100) NOT NULL,
    address text,
    capacity numeric(10,2) DEFAULT 200 NOT NULL,
    used numeric(10,2) DEFAULT 0 NOT NULL,
    surface numeric(10,2) DEFAULT 0,
    status character varying(30) DEFAULT 'actif'::character varying NOT NULL,
    type character varying(50) DEFAULT 'Industriel'::character varying,
    responsable character varying(200),
    phone character varying(50),
    ouverture character varying(100) DEFAULT 'Lun-Sam 8h-17h'::character varying,
    notes text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT warehouses_status_check CHECK (((status)::text = ANY ((ARRAY['actif'::character varying, 'inactif'::character varying, 'maintenance'::character varying, 'ouverture prÃ©vue'::character varying])::text[])))
);


ALTER TABLE public.warehouses OWNER TO postgres;

--
-- Name: categories id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.categories ALTER COLUMN id SET DEFAULT nextval('public.categories_id_seq'::regclass);


--
-- Name: token_packages id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.token_packages ALTER COLUMN id SET DEFAULT nextval('public.token_packages_id_seq'::regclass);


--
-- Name: auction_bids auction_bids_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.auction_bids
    ADD CONSTRAINT auction_bids_pkey PRIMARY KEY (id);


--
-- Name: categories categories_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.categories
    ADD CONSTRAINT categories_pkey PRIMARY KEY (id);


--
-- Name: categories categories_slug_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.categories
    ADD CONSTRAINT categories_slug_key UNIQUE (slug);


--
-- Name: conversations conversations_participant_1_participant_2_product_id_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.conversations
    ADD CONSTRAINT conversations_participant_1_participant_2_product_id_key UNIQUE (participant_1, participant_2, product_id);


--
-- Name: conversations conversations_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.conversations
    ADD CONSTRAINT conversations_pkey PRIMARY KEY (id);


--
-- Name: disputes disputes_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.disputes
    ADD CONSTRAINT disputes_pkey PRIMARY KEY (id);


--
-- Name: escrow_transactions escrow_transactions_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.escrow_transactions
    ADD CONSTRAINT escrow_transactions_pkey PRIMARY KEY (id);


--
-- Name: lot_items lot_items_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.lot_items
    ADD CONSTRAINT lot_items_pkey PRIMARY KEY (id);


--
-- Name: lot_watchers lot_watchers_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.lot_watchers
    ADD CONSTRAINT lot_watchers_pkey PRIMARY KEY (lot_id, user_id);


--
-- Name: lots lots_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.lots
    ADD CONSTRAINT lots_pkey PRIMARY KEY (id);


--
-- Name: lots lots_slug_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.lots
    ADD CONSTRAINT lots_slug_key UNIQUE (slug);


--
-- Name: messages messages_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.messages
    ADD CONSTRAINT messages_pkey PRIMARY KEY (id);


--
-- Name: notifications notifications_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.notifications
    ADD CONSTRAINT notifications_pkey PRIMARY KEY (id);


--
-- Name: orders orders_order_number_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.orders
    ADD CONSTRAINT orders_order_number_key UNIQUE (order_number);


--
-- Name: orders orders_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.orders
    ADD CONSTRAINT orders_pkey PRIMARY KEY (id);


--
-- Name: price_suggestions price_suggestions_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.price_suggestions
    ADD CONSTRAINT price_suggestions_pkey PRIMARY KEY (id);


--
-- Name: product_favorites product_favorites_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.product_favorites
    ADD CONSTRAINT product_favorites_pkey PRIMARY KEY (user_id, product_id);


--
-- Name: products products_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.products
    ADD CONSTRAINT products_pkey PRIMARY KEY (id);


--
-- Name: products products_slug_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.products
    ADD CONSTRAINT products_slug_key UNIQUE (slug);


--
-- Name: quotes quotes_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.quotes
    ADD CONSTRAINT quotes_pkey PRIMARY KEY (id);


--
-- Name: reviews reviews_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.reviews
    ADD CONSTRAINT reviews_pkey PRIMARY KEY (id);


--
-- Name: seller_qualifications seller_qualifications_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.seller_qualifications
    ADD CONSTRAINT seller_qualifications_pkey PRIMARY KEY (id);


--
-- Name: service_requests service_requests_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.service_requests
    ADD CONSTRAINT service_requests_pkey PRIMARY KEY (id);


--
-- Name: sla_contracts sla_contracts_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.sla_contracts
    ADD CONSTRAINT sla_contracts_pkey PRIMARY KEY (id);


--
-- Name: stock_analyses stock_analyses_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.stock_analyses
    ADD CONSTRAINT stock_analyses_pkey PRIMARY KEY (id);


--
-- Name: storage_requests storage_requests_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.storage_requests
    ADD CONSTRAINT storage_requests_pkey PRIMARY KEY (id);


--
-- Name: token_packages token_packages_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.token_packages
    ADD CONSTRAINT token_packages_pkey PRIMARY KEY (id);


--
-- Name: token_transactions token_transactions_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.token_transactions
    ADD CONSTRAINT token_transactions_pkey PRIMARY KEY (id);


--
-- Name: traceability_certificates traceability_certificates_certificate_ref_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.traceability_certificates
    ADD CONSTRAINT traceability_certificates_certificate_ref_key UNIQUE (certificate_ref);


--
-- Name: traceability_certificates traceability_certificates_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.traceability_certificates
    ADD CONSTRAINT traceability_certificates_pkey PRIMARY KEY (id);


--
-- Name: traceability_certificates traceability_certificates_verification_hash_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.traceability_certificates
    ADD CONSTRAINT traceability_certificates_verification_hash_key UNIQUE (verification_hash);


--
-- Name: transport_bookings transport_bookings_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.transport_bookings
    ADD CONSTRAINT transport_bookings_pkey PRIMARY KEY (id);


--
-- Name: transports transports_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.transports
    ADD CONSTRAINT transports_pkey PRIMARY KEY (id);


--
-- Name: trust_score_logs trust_score_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.trust_score_logs
    ADD CONSTRAINT trust_score_logs_pkey PRIMARY KEY (id);


--
-- Name: urgent_requests urgent_requests_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.urgent_requests
    ADD CONSTRAINT urgent_requests_pkey PRIMARY KEY (id);


--
-- Name: users users_email_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key UNIQUE (email);


--
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- Name: warehouse_articles warehouse_articles_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.warehouse_articles
    ADD CONSTRAINT warehouse_articles_pkey PRIMARY KEY (id);


--
-- Name: warehouses warehouses_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.warehouses
    ADD CONSTRAINT warehouses_pkey PRIMARY KEY (id);


--
-- Name: idx_bids_amount; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_bids_amount ON public.auction_bids USING btree (lot_id, amount DESC);


--
-- Name: idx_bids_bidder; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_bids_bidder ON public.auction_bids USING btree (bidder_id);


--
-- Name: idx_bids_lot; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_bids_lot ON public.auction_bids USING btree (lot_id);


--
-- Name: idx_categories_parent; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_categories_parent ON public.categories USING btree (parent_id);


--
-- Name: idx_categories_slug; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_categories_slug ON public.categories USING btree (slug);


--
-- Name: idx_cert_hash; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_cert_hash ON public.traceability_certificates USING btree (verification_hash);


--
-- Name: idx_cert_product; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_cert_product ON public.traceability_certificates USING btree (product_id);


--
-- Name: idx_cert_ref; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_cert_ref ON public.traceability_certificates USING btree (certificate_ref);


--
-- Name: idx_conv_p1; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_conv_p1 ON public.conversations USING btree (participant_1);


--
-- Name: idx_conv_p2; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_conv_p2 ON public.conversations USING btree (participant_2);


--
-- Name: idx_disputes_order; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_disputes_order ON public.disputes USING btree (order_id);


--
-- Name: idx_disputes_status; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_disputes_status ON public.disputes USING btree (status);


--
-- Name: idx_escrow_order; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_escrow_order ON public.escrow_transactions USING btree (order_id);


--
-- Name: idx_escrow_status; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_escrow_status ON public.escrow_transactions USING btree (status);


--
-- Name: idx_lot_items_lot; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_lot_items_lot ON public.lot_items USING btree (lot_id);


--
-- Name: idx_lot_items_product; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_lot_items_product ON public.lot_items USING btree (product_id);


--
-- Name: idx_lots_end; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_lots_end ON public.lots USING btree (auction_end);


--
-- Name: idx_lots_seller; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_lots_seller ON public.lots USING btree (seller_id);


--
-- Name: idx_lots_slug; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_lots_slug ON public.lots USING btree (slug);


--
-- Name: idx_lots_status; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_lots_status ON public.lots USING btree (status);


--
-- Name: idx_lots_type; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_lots_type ON public.lots USING btree (lot_type);


--
-- Name: idx_messages_conv; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_messages_conv ON public.messages USING btree (conversation_id);


--
-- Name: idx_messages_sender; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_messages_sender ON public.messages USING btree (sender_id);


--
-- Name: idx_messages_unread; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_messages_unread ON public.messages USING btree (is_read) WHERE (is_read = false);


--
-- Name: idx_notif_unread; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_notif_unread ON public.notifications USING btree (user_id, is_read) WHERE (is_read = false);


--
-- Name: idx_notif_user; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_notif_user ON public.notifications USING btree (user_id);


--
-- Name: idx_orders_buyer; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_orders_buyer ON public.orders USING btree (buyer_id);


--
-- Name: idx_orders_number; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_orders_number ON public.orders USING btree (order_number);


--
-- Name: idx_orders_product; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_orders_product ON public.orders USING btree (product_id);


--
-- Name: idx_orders_seller; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_orders_seller ON public.orders USING btree (seller_id);


--
-- Name: idx_orders_status; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_orders_status ON public.orders USING btree (status);


--
-- Name: idx_products_category; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_products_category ON public.products USING btree (category_id);


--
-- Name: idx_products_city; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_products_city ON public.products USING btree (location_city);


--
-- Name: idx_products_condition; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_products_condition ON public.products USING btree (condition);


--
-- Name: idx_products_created; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_products_created ON public.products USING btree (created_at DESC);


--
-- Name: idx_products_is_auto; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_products_is_auto ON public.products USING btree (is_auto) WHERE (is_auto = true);


--
-- Name: idx_products_price; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_products_price ON public.products USING btree (price);


--
-- Name: idx_products_seller; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_products_seller ON public.products USING btree (seller_id);


--
-- Name: idx_products_status; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_products_status ON public.products USING btree (status);


--
-- Name: idx_products_tags; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_products_tags ON public.products USING gin (tags);


--
-- Name: idx_products_title_trgm; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_products_title_trgm ON public.products USING gin (title public.gin_trgm_ops);


--
-- Name: idx_quotes_buyer; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_quotes_buyer ON public.quotes USING btree (buyer_id);


--
-- Name: idx_quotes_product; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_quotes_product ON public.quotes USING btree (product_id);


--
-- Name: idx_quotes_seller; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_quotes_seller ON public.quotes USING btree (seller_id);


--
-- Name: idx_quotes_status; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_quotes_status ON public.quotes USING btree (status);


--
-- Name: idx_reviews_order; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_reviews_order ON public.reviews USING btree (order_id);


--
-- Name: idx_reviews_reviewed; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_reviews_reviewed ON public.reviews USING btree (reviewed_id);


--
-- Name: idx_seller_qual_unique; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX idx_seller_qual_unique ON public.seller_qualifications USING btree (seller_id);


--
-- Name: idx_service_status; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_service_status ON public.service_requests USING btree (status);


--
-- Name: idx_service_type; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_service_type ON public.service_requests USING btree (type);


--
-- Name: idx_service_user; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_service_user ON public.service_requests USING btree (user_id);


--
-- Name: idx_storage_requests_created; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_storage_requests_created ON public.storage_requests USING btree (created_at DESC);


--
-- Name: idx_storage_requests_seller; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_storage_requests_seller ON public.storage_requests USING btree (seller_id);


--
-- Name: idx_storage_requests_status; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_storage_requests_status ON public.storage_requests USING btree (status);


--
-- Name: idx_tb_carrier; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_tb_carrier ON public.transport_bookings USING btree (carrier_id);


--
-- Name: idx_tb_order; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_tb_order ON public.transport_bookings USING btree (order_id);


--
-- Name: idx_tb_transport; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_tb_transport ON public.transport_bookings USING btree (transport_id);


--
-- Name: idx_token_tx_date; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_token_tx_date ON public.token_transactions USING btree (created_at DESC);


--
-- Name: idx_token_tx_user; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_token_tx_user ON public.token_transactions USING btree (user_id);


--
-- Name: idx_transports_arrival; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_transports_arrival ON public.transports USING btree (arrival_city);


--
-- Name: idx_transports_date; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_transports_date ON public.transports USING btree (departure_date);


--
-- Name: idx_transports_departure; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_transports_departure ON public.transports USING btree (departure_city);


--
-- Name: idx_trust_entity; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_trust_entity ON public.trust_score_logs USING btree (entity_type, entity_id);


--
-- Name: idx_urgent_buyer; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_urgent_buyer ON public.urgent_requests USING btree (buyer_id);


--
-- Name: idx_urgent_expires; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_urgent_expires ON public.urgent_requests USING btree (expires_at);


--
-- Name: idx_urgent_status; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_urgent_status ON public.urgent_requests USING btree (status);


--
-- Name: idx_users_city; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_users_city ON public.users USING btree (city);


--
-- Name: idx_users_email; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_users_email ON public.users USING btree (email);


--
-- Name: idx_users_role; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_users_role ON public.users USING btree (role);


--
-- Name: idx_users_sector; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_users_sector ON public.users USING btree (sector);


--
-- Name: idx_wa_product; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_wa_product ON public.warehouse_articles USING btree (product_id);


--
-- Name: idx_wa_request; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_wa_request ON public.warehouse_articles USING btree (storage_request_id);


--
-- Name: idx_wa_seller; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_wa_seller ON public.warehouse_articles USING btree (seller_id);


--
-- Name: idx_wa_status; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_wa_status ON public.warehouse_articles USING btree (status);


--
-- Name: idx_wa_warehouse; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_wa_warehouse ON public.warehouse_articles USING btree (warehouse_id);


--
-- Name: idx_warehouses_status; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_warehouses_status ON public.warehouses USING btree (status);


--
-- Name: storage_requests storage_requests_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER storage_requests_updated_at BEFORE UPDATE ON public.storage_requests FOR EACH ROW EXECUTE FUNCTION public.update_storage_updated_at();


--
-- Name: orders trg_orders_updated; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER trg_orders_updated BEFORE UPDATE ON public.orders FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();


--
-- Name: products trg_product_count; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER trg_product_count AFTER INSERT OR DELETE OR UPDATE ON public.products FOR EACH ROW EXECUTE FUNCTION public.update_category_count();


--
-- Name: products trg_products_updated; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER trg_products_updated BEFORE UPDATE ON public.products FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();


--
-- Name: quotes trg_quotes_updated; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER trg_quotes_updated BEFORE UPDATE ON public.quotes FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();


--
-- Name: products trg_trust_score; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER trg_trust_score BEFORE INSERT OR UPDATE OF images, technical_sheet_url, revex_certified, quality_grade, specifications, description ON public.products FOR EACH ROW EXECUTE FUNCTION public.trigger_update_trust_score();


--
-- Name: users trg_users_updated; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER trg_users_updated BEFORE UPDATE ON public.users FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();


--
-- Name: warehouse_articles wa_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER wa_updated_at BEFORE UPDATE ON public.warehouse_articles FOR EACH ROW EXECUTE FUNCTION public.update_wa_updated_at();


--
-- Name: warehouses warehouses_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER warehouses_updated_at BEFORE UPDATE ON public.warehouses FOR EACH ROW EXECUTE FUNCTION public.update_warehouses_updated_at();


--
-- Name: auction_bids auction_bids_bidder_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.auction_bids
    ADD CONSTRAINT auction_bids_bidder_id_fkey FOREIGN KEY (bidder_id) REFERENCES public.users(id);


--
-- Name: auction_bids auction_bids_lot_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.auction_bids
    ADD CONSTRAINT auction_bids_lot_id_fkey FOREIGN KEY (lot_id) REFERENCES public.lots(id) ON DELETE CASCADE;


--
-- Name: categories categories_parent_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.categories
    ADD CONSTRAINT categories_parent_id_fkey FOREIGN KEY (parent_id) REFERENCES public.categories(id) ON DELETE SET NULL;


--
-- Name: conversations conversations_participant_1_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.conversations
    ADD CONSTRAINT conversations_participant_1_fkey FOREIGN KEY (participant_1) REFERENCES public.users(id);


--
-- Name: conversations conversations_participant_2_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.conversations
    ADD CONSTRAINT conversations_participant_2_fkey FOREIGN KEY (participant_2) REFERENCES public.users(id);


--
-- Name: conversations conversations_product_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.conversations
    ADD CONSTRAINT conversations_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.products(id) ON DELETE SET NULL;


--
-- Name: disputes disputes_buyer_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.disputes
    ADD CONSTRAINT disputes_buyer_id_fkey FOREIGN KEY (buyer_id) REFERENCES public.users(id);


--
-- Name: disputes disputes_escrow_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.disputes
    ADD CONSTRAINT disputes_escrow_id_fkey FOREIGN KEY (escrow_id) REFERENCES public.escrow_transactions(id);


--
-- Name: disputes disputes_opened_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.disputes
    ADD CONSTRAINT disputes_opened_by_fkey FOREIGN KEY (opened_by) REFERENCES public.users(id);


--
-- Name: disputes disputes_order_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.disputes
    ADD CONSTRAINT disputes_order_id_fkey FOREIGN KEY (order_id) REFERENCES public.orders(id);


--
-- Name: disputes disputes_resolved_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.disputes
    ADD CONSTRAINT disputes_resolved_by_fkey FOREIGN KEY (resolved_by) REFERENCES public.users(id);


--
-- Name: disputes disputes_seller_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.disputes
    ADD CONSTRAINT disputes_seller_id_fkey FOREIGN KEY (seller_id) REFERENCES public.users(id);


--
-- Name: escrow_transactions escrow_transactions_order_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.escrow_transactions
    ADD CONSTRAINT escrow_transactions_order_id_fkey FOREIGN KEY (order_id) REFERENCES public.orders(id) ON DELETE CASCADE;


--
-- Name: lot_items lot_items_lot_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.lot_items
    ADD CONSTRAINT lot_items_lot_id_fkey FOREIGN KEY (lot_id) REFERENCES public.lots(id) ON DELETE CASCADE;


--
-- Name: lot_items lot_items_product_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.lot_items
    ADD CONSTRAINT lot_items_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.products(id) ON DELETE SET NULL;


--
-- Name: lot_watchers lot_watchers_lot_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.lot_watchers
    ADD CONSTRAINT lot_watchers_lot_id_fkey FOREIGN KEY (lot_id) REFERENCES public.lots(id) ON DELETE CASCADE;


--
-- Name: lot_watchers lot_watchers_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.lot_watchers
    ADD CONSTRAINT lot_watchers_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: lots lots_auction_winner_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.lots
    ADD CONSTRAINT lots_auction_winner_id_fkey FOREIGN KEY (auction_winner_id) REFERENCES public.users(id);


--
-- Name: lots lots_seller_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.lots
    ADD CONSTRAINT lots_seller_id_fkey FOREIGN KEY (seller_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: messages messages_conversation_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.messages
    ADD CONSTRAINT messages_conversation_id_fkey FOREIGN KEY (conversation_id) REFERENCES public.conversations(id) ON DELETE CASCADE;


--
-- Name: messages messages_sender_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.messages
    ADD CONSTRAINT messages_sender_id_fkey FOREIGN KEY (sender_id) REFERENCES public.users(id);


--
-- Name: notifications notifications_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.notifications
    ADD CONSTRAINT notifications_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: orders orders_buyer_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.orders
    ADD CONSTRAINT orders_buyer_id_fkey FOREIGN KEY (buyer_id) REFERENCES public.users(id);


--
-- Name: orders orders_product_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.orders
    ADD CONSTRAINT orders_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.products(id);


--
-- Name: orders orders_seller_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.orders
    ADD CONSTRAINT orders_seller_id_fkey FOREIGN KEY (seller_id) REFERENCES public.users(id);


--
-- Name: price_suggestions price_suggestions_product_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.price_suggestions
    ADD CONSTRAINT price_suggestions_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.products(id) ON DELETE CASCADE;


--
-- Name: product_favorites product_favorites_product_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.product_favorites
    ADD CONSTRAINT product_favorites_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.products(id) ON DELETE CASCADE;


--
-- Name: product_favorites product_favorites_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.product_favorites
    ADD CONSTRAINT product_favorites_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: products products_category_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.products
    ADD CONSTRAINT products_category_id_fkey FOREIGN KEY (category_id) REFERENCES public.categories(id) ON DELETE SET NULL;


--
-- Name: products products_seller_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.products
    ADD CONSTRAINT products_seller_id_fkey FOREIGN KEY (seller_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: quotes quotes_buyer_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.quotes
    ADD CONSTRAINT quotes_buyer_id_fkey FOREIGN KEY (buyer_id) REFERENCES public.users(id);


--
-- Name: quotes quotes_product_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.quotes
    ADD CONSTRAINT quotes_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.products(id) ON DELETE CASCADE;


--
-- Name: quotes quotes_seller_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.quotes
    ADD CONSTRAINT quotes_seller_id_fkey FOREIGN KEY (seller_id) REFERENCES public.users(id);


--
-- Name: reviews reviews_order_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.reviews
    ADD CONSTRAINT reviews_order_id_fkey FOREIGN KEY (order_id) REFERENCES public.orders(id);


--
-- Name: reviews reviews_reviewed_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.reviews
    ADD CONSTRAINT reviews_reviewed_id_fkey FOREIGN KEY (reviewed_id) REFERENCES public.users(id);


--
-- Name: reviews reviews_reviewer_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.reviews
    ADD CONSTRAINT reviews_reviewer_id_fkey FOREIGN KEY (reviewer_id) REFERENCES public.users(id);


--
-- Name: seller_qualifications seller_qualifications_reviewed_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.seller_qualifications
    ADD CONSTRAINT seller_qualifications_reviewed_by_fkey FOREIGN KEY (reviewed_by) REFERENCES public.users(id);


--
-- Name: seller_qualifications seller_qualifications_seller_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.seller_qualifications
    ADD CONSTRAINT seller_qualifications_seller_id_fkey FOREIGN KEY (seller_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: service_requests service_requests_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.service_requests
    ADD CONSTRAINT service_requests_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: sla_contracts sla_contracts_buyer_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.sla_contracts
    ADD CONSTRAINT sla_contracts_buyer_id_fkey FOREIGN KEY (buyer_id) REFERENCES public.users(id);


--
-- Name: sla_contracts sla_contracts_seller_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.sla_contracts
    ADD CONSTRAINT sla_contracts_seller_id_fkey FOREIGN KEY (seller_id) REFERENCES public.users(id);


--
-- Name: stock_analyses stock_analyses_company_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.stock_analyses
    ADD CONSTRAINT stock_analyses_company_id_fkey FOREIGN KEY (company_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: storage_requests storage_requests_seller_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.storage_requests
    ADD CONSTRAINT storage_requests_seller_id_fkey FOREIGN KEY (seller_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: token_transactions token_transactions_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.token_transactions
    ADD CONSTRAINT token_transactions_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: traceability_certificates traceability_certificates_buyer_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.traceability_certificates
    ADD CONSTRAINT traceability_certificates_buyer_id_fkey FOREIGN KEY (buyer_id) REFERENCES public.users(id);


--
-- Name: traceability_certificates traceability_certificates_order_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.traceability_certificates
    ADD CONSTRAINT traceability_certificates_order_id_fkey FOREIGN KEY (order_id) REFERENCES public.orders(id);


--
-- Name: traceability_certificates traceability_certificates_product_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.traceability_certificates
    ADD CONSTRAINT traceability_certificates_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.products(id);


--
-- Name: traceability_certificates traceability_certificates_seller_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.traceability_certificates
    ADD CONSTRAINT traceability_certificates_seller_id_fkey FOREIGN KEY (seller_id) REFERENCES public.users(id);


--
-- Name: traceability_certificates traceability_certificates_validated_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.traceability_certificates
    ADD CONSTRAINT traceability_certificates_validated_by_fkey FOREIGN KEY (validated_by) REFERENCES public.users(id);


--
-- Name: transport_bookings transport_bookings_buyer_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.transport_bookings
    ADD CONSTRAINT transport_bookings_buyer_id_fkey FOREIGN KEY (buyer_id) REFERENCES public.users(id);


--
-- Name: transport_bookings transport_bookings_carrier_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.transport_bookings
    ADD CONSTRAINT transport_bookings_carrier_id_fkey FOREIGN KEY (carrier_id) REFERENCES public.users(id);


--
-- Name: transport_bookings transport_bookings_order_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.transport_bookings
    ADD CONSTRAINT transport_bookings_order_id_fkey FOREIGN KEY (order_id) REFERENCES public.orders(id) ON DELETE CASCADE;


--
-- Name: transport_bookings transport_bookings_seller_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.transport_bookings
    ADD CONSTRAINT transport_bookings_seller_id_fkey FOREIGN KEY (seller_id) REFERENCES public.users(id);


--
-- Name: transport_bookings transport_bookings_transport_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.transport_bookings
    ADD CONSTRAINT transport_bookings_transport_id_fkey FOREIGN KEY (transport_id) REFERENCES public.transports(id);


--
-- Name: transports transports_carrier_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.transports
    ADD CONSTRAINT transports_carrier_id_fkey FOREIGN KEY (carrier_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: urgent_requests urgent_requests_buyer_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.urgent_requests
    ADD CONSTRAINT urgent_requests_buyer_id_fkey FOREIGN KEY (buyer_id) REFERENCES public.users(id);


--
-- Name: urgent_requests urgent_requests_matched_product_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.urgent_requests
    ADD CONSTRAINT urgent_requests_matched_product_id_fkey FOREIGN KEY (matched_product_id) REFERENCES public.products(id);


--
-- Name: urgent_requests urgent_requests_matched_seller_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.urgent_requests
    ADD CONSTRAINT urgent_requests_matched_seller_id_fkey FOREIGN KEY (matched_seller_id) REFERENCES public.users(id);


--
-- Name: urgent_requests urgent_requests_product_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.urgent_requests
    ADD CONSTRAINT urgent_requests_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.products(id);


--
-- Name: warehouse_articles warehouse_articles_product_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.warehouse_articles
    ADD CONSTRAINT warehouse_articles_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.products(id) ON DELETE SET NULL;


--
-- Name: warehouse_articles warehouse_articles_seller_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.warehouse_articles
    ADD CONSTRAINT warehouse_articles_seller_id_fkey FOREIGN KEY (seller_id) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: warehouse_articles warehouse_articles_storage_request_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.warehouse_articles
    ADD CONSTRAINT warehouse_articles_storage_request_id_fkey FOREIGN KEY (storage_request_id) REFERENCES public.storage_requests(id) ON DELETE SET NULL;


--
-- Name: warehouse_articles warehouse_articles_warehouse_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.warehouse_articles
    ADD CONSTRAINT warehouse_articles_warehouse_id_fkey FOREIGN KEY (warehouse_id) REFERENCES public.warehouses(id) ON DELETE CASCADE;


--
-- PostgreSQL database dump complete
--

\unrestrict O5rGCAbJ0pOoM4zrt514vQZWFGcUwY823btj9EDm3OHxaevexdEo6WmhhEcWTnQ

