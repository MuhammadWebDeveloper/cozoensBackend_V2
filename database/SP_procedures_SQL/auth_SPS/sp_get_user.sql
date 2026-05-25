-- ============================================
-- STORED PROCEDURE: sp_get_user
-- Purpose: Get user by ID (for profile/current user)
-- Created: May 23, 2026
-- ============================================

CREATE OR REPLACE FUNCTION sp_get_user(
    p_user_id UUID
)
RETURNS TABLE(
    user_id UUID,
    user_full_name VARCHAR,
    user_email VARCHAR,
    user_role VARCHAR,
    user_phone VARCHAR
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        u.id,
        u.full_name,
        u.email,
        u.role,
        u.phone
    FROM users u
    WHERE u.id = p_user_id;
END;
$$ LANGUAGE plpgsql;

-- Add comment
COMMENT ON FUNCTION sp_get_user(UUID) IS 'Get user details by user ID';