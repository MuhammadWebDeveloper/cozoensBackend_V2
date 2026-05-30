CREATE TABLE IF NOT EXISTS public.bookings (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL,
    space_unit_id uuid NOT NULL,
    start_time timestamp without time zone NOT NULL,
    end_time timestamp without time zone NOT NULL,
    total_price numeric(10, 2) NOT NULL,
    status character varying(20) DEFAULT 'confirmed',
    booking_ref character varying(20) NOT NULL DEFAULT upper(substring(gen_random_uuid()::text, 1, 8)),
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT bookings_pkey PRIMARY KEY (id),
    CONSTRAINT bookings_booking_ref_key UNIQUE (booking_ref),
    CONSTRAINT bookings_space_unit_id_fkey FOREIGN KEY (space_unit_id) 
        REFERENCES public.space_units(id) ON DELETE CASCADE,
    CONSTRAINT bookings_status_check CHECK (
        status IN ('confirmed', 'cancelled', 'completed')
    )
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_bookings_status ON public.bookings(status);
CREATE INDEX IF NOT EXISTS idx_bookings_unit ON public.bookings(space_unit_id);
CREATE INDEX IF NOT EXISTS idx_bookings_user ON public.bookings(user_id);
CREATE INDEX IF NOT EXISTS idx_bookings_dates ON public.bookings(start_time, end_time);