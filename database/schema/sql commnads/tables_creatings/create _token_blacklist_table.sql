-- =====================================================
-- 3. TOKEN_BLACKLIST TABLE (References users)
-- =====================================================
-- First create the sequence if it doesn't exist
CREATE SEQUENCE IF NOT EXISTS token_blacklist_id_seq;

CREATE TABLE IF NOT EXISTS public.token_blacklist
(
    id integer NOT NULL DEFAULT nextval('token_blacklist_id_seq'::regclass),
    token_hash character varying(255) COLLATE pg_catalog."default" NOT NULL,
    user_id uuid,
    expires_at timestamp without time zone NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT token_blacklist_pkey PRIMARY KEY (id),
    CONSTRAINT token_blacklist_token_hash_key UNIQUE (token_hash),
    CONSTRAINT token_blacklist_user_id_fkey FOREIGN KEY (user_id)
        REFERENCES public.users (id) MATCH SIMPLE
        ON UPDATE NO ACTION
        ON DELETE CASCADE
)
TABLESPACE pg_default;

ALTER TABLE IF EXISTS public.token_blacklist OWNER TO postgres;

-- Indexes for token_blacklist
CREATE INDEX IF NOT EXISTS idx_token_blacklist_expires ON public.token_blacklist USING btree (expires_at ASC NULLS LAST) TABLESPACE pg_default;
CREATE INDEX IF NOT EXISTS idx_token_blacklist_hash ON public.token_blacklist USING btree (token_hash COLLATE pg_catalog."default" ASC NULLS LAST) TABLESPACE pg_default;
CREATE INDEX IF NOT EXISTS idx_token_blacklist_user ON public.token_blacklist USING btree (user_id ASC NULLS LAST) TABLESPACE pg_default;