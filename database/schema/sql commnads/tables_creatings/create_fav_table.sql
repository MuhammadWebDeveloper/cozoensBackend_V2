-- =====================================================
-- 5. FAVORITES TABLE (References users and spaces)
-- =====================================================
CREATE TABLE IF NOT EXISTS public.favorites
(
    user_id uuid NOT NULL,
    space_id uuid NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT favorites_pkey PRIMARY KEY (user_id, space_id),
    CONSTRAINT favorites_space_id_fkey FOREIGN KEY (space_id)
        REFERENCES public.spaces (id) MATCH SIMPLE
        ON UPDATE NO ACTION
        ON DELETE CASCADE
)
TABLESPACE pg_default;

ALTER TABLE IF EXISTS public.favorites OWNER TO postgres;

-- Indexes for favorites
CREATE INDEX IF NOT EXISTS idx_favorites_user ON public.favorites USING btree (user_id ASC NULLS LAST) TABLESPACE pg_default;
