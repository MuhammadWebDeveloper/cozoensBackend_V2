-- =====================================================
-- 6. BOOKINGS TABLE (References users and space_units)
-- =====================================================
-- Note: The EXCLUDE constraint requires the btree_gist extension
-- Run this if not already enabled: CREATE EXTENSION IF NOT EXISTS btree_gist;
CREATE TABLE IF NOT EXISTS public.bookings (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL,
    space_unit_id uuid NOT NULL,
    start_time timestamp without time zone NOT NULL,
    end_time timestamp without time zone NOT NULL,
    total_price numeric(10, 2) NOT NULL,
    status character varying(20) COLLATE pg_catalog."default" DEFAULT 'confirmed'::character varying,
    booking_ref character varying(20) COLLATE pg_catalog."default" NOT NULL DEFAULT upper("substring"((gen_random_uuid())::text, 1, 8)),
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT bookings_pkey PRIMARY KEY (id),
    CONSTRAINT bookings_booking_ref_key UNIQUE (booking_ref),
    CONSTRAINT bookings_space_unit_id_fkey FOREIGN KEY (space_unit_id) REFERENCES public.space_units (id) MATCH SIMPLE ON UPDATE NO ACTION ON DELETE CASCADE,
    CONSTRAINT bookings_status_check CHECK (
        status::text = ANY (
            ARRAY ['confirmed'::character varying, 'cancelled'::character varying, 'completed'::character varying]::text []
        )
    ),
    CONSTRAINT no_overlap EXCLUDE USING gist (
        space_unit_id WITH =,
        tsrange(start_time, end_time) WITH &&
    )
) TABLESPACE pg_default;
ALTER TABLE IF EXISTS public.bookings OWNER TO postgres;
-- Indexes for bookings
CREATE INDEX IF NOT EXISTS idx_bookings_status ON public.bookings USING btree (
    status COLLATE pg_catalog."default" ASC NULLS LAST
) TABLESPACE pg_default;
CREATE INDEX IF NOT EXISTS idx_bookings_unit ON public.bookings USING btree (space_unit_id ASC NULLS LAST) TABLESPACE pg_default;
CREATE INDEX IF NOT EXISTS idx_bookings_user ON public.bookings USING btree (user_id ASC NULLS LAST) TABLESPACE pg_default;