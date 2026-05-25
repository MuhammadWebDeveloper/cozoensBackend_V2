-- ============================================
-- STORED PROCEDURE: sp_login
-- Purpose: Authenticate user and return user data
-- Created: May 23, 2026
-- ============================================

CREATE OR REPLACE FUNCTION sp_login(
    p_email VARCHAR
)
RETURNS TABLE(
    user_id UUID,
    user_full_name VARCHAR,
    user_email VARCHAR,
    user_role VARCHAR,
    user_phone VARCHAR,
    password_hash TEXT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        u.id,
        u.full_name,
        u.email,
        u.role,
        u.phone,
        u.password_hash
    FROM users u
    WHERE u.email = p_email;
END;
$$ LANGUAGE plpgsql;

-- Add comment
COMMENT ON FUNCTION sp_login(VARCHAR) IS 'Get user by email for login authentication';

-- Test the stored procedure
SELECT * FROM sp_login('mhammadcaptain303@gmail.com');