-- =====================================================
-- 2. SPACES TABLE (References users via owner_id)
-- =====================================================
CREATE TABLE IF NOT EXISTS public.spaces
(
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    owner_id uuid NOT NULL,
    name character varying(255) COLLATE pg_catalog."default" NOT NULL,
    description text COLLATE pg_catalog."default",
    address text COLLATE pg_catalog."default",
    city character varying(100) COLLATE pg_catalog."default",
    area character varying(100) COLLATE pg_catalog."default",
    google_maps_link text COLLATE pg_catalog."default",
    latitude numeric(9,6),
    longitude numeric(9,6),
    opening_time time without time zone,
    closing_time time without time zone,
    working_days text[] COLLATE pg_catalog."default",
    has_wifi boolean DEFAULT false,
    has_ac boolean DEFAULT false,
    has_coffee boolean DEFAULT false,
    has_printer boolean DEFAULT false,
    has_parking boolean DEFAULT false,
    has_security boolean DEFAULT false,
    has_backup_power boolean DEFAULT false,
    cover_image text COLLATE pg_catalog."default",
    gallery_images text[] COLLATE pg_catalog."default",
    cancellation_policy text COLLATE pg_catalog."default",
    refund_policy text COLLATE pg_catalog."default",
    late_arrival_policy text COLLATE pg_catalog."default",
    is_verified boolean DEFAULT false,
    is_active boolean DEFAULT true,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT spaces_pkey PRIMARY KEY (id)
)
TABLESPACE pg_default;

ALTER TABLE IF EXISTS public.spaces OWNER TO postgres;

-- Indexes for spaces
CREATE INDEX IF NOT EXISTS idx_spaces_city ON public.spaces USING btree (city COLLATE pg_catalog."default" ASC NULLS LAST) TABLESPACE pg_default;
CREATE INDEX IF NOT EXISTS idx_spaces_owner ON public.spaces USING btree (owner_id ASC NULLS LAST) TABLESPACE pg_default;