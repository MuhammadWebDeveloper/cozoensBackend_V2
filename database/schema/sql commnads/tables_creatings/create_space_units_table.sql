
-- =====================================================
-- 4. SPACE_UNITS TABLE (References spaces)
-- =====================================================
CREATE TABLE IF NOT EXISTS public.space_units
(
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    space_id uuid NOT NULL,
    unit_type character varying(50) COLLATE pg_catalog."default" NOT NULL,
    total_capacity integer NOT NULL DEFAULT 1,
    hourly_rate numeric(10,2),
    daily_rate numeric(10,2),
    monthly_rate numeric(10,2),
    is_active boolean DEFAULT true,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    images jsonb DEFAULT '[]'::jsonb,
    duration character varying(100) COLLATE pg_catalog."default",
    name character varying(100) COLLATE pg_catalog."default",
    CONSTRAINT space_units_pkey PRIMARY KEY (id),
    CONSTRAINT space_units_space_id_unit_type_key UNIQUE (space_id, unit_type),
    CONSTRAINT space_units_space_id_fkey FOREIGN KEY (space_id)
        REFERENCES public.spaces (id) MATCH SIMPLE
        ON UPDATE NO ACTION
        ON DELETE CASCADE,
    CONSTRAINT space_units_unit_type_check CHECK (unit_type::text = ANY (ARRAY['open_desk'::character varying, 'dedicated_desk'::character varying, 'private_cabin'::character varying, 'meeting_room'::character varying]::text[]))
)
TABLESPACE pg_default;

ALTER TABLE IF EXISTS public.space_units OWNER TO postgres;

-- Indexes for space_units
CREATE INDEX IF NOT EXISTS idx_space_units_images ON public.space_units USING gin (images) TABLESPACE pg_default;
CREATE INDEX IF NOT EXISTS idx_space_units_space ON public.space_units USING btree (space_id ASC NULLS LAST) TABLESPACE pg_default;
