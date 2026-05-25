-- ============================================
-- DROP EXISTING FUNCTION
-- ============================================
DROP FUNCTION IF EXISTS sp_signup(character varying, character varying, character varying, character varying) CASCADE;

-- ============================================
-- CREATE NEW FUNCTION
-- ============================================
CREATE OR REPLACE FUNCTION sp_signup(
    p_full_name character varying,
    p_email character varying,
    p_password_hash character varying,
    p_phone character varying DEFAULT NULL
)
RETURNS TABLE(
    user_id uuid,
    user_full_name character varying,
    user_email character varying,
    user_role character varying,
    message character varying
) AS $$
DECLARE
    v_user_id uuid;
    v_user_full_name character varying;
    v_user_email character varying;
    v_user_role character varying;
BEGIN
    -- Check if user already exists
    IF EXISTS (SELECT 1 FROM users WHERE email = p_email) THEN
        RETURN QUERY SELECT 
            NULL::uuid, 
            NULL::character varying, 
            NULL::character varying, 
            NULL::character varying, 
            'User already exists'::character varying;
        RETURN;
    END IF;
    
    -- Insert new user
    INSERT INTO users (full_name, email, password_hash, phone)
    VALUES (p_full_name, p_email, p_password_hash, p_phone)
    RETURNING id, full_name, email, role 
    INTO v_user_id, v_user_full_name, v_user_email, v_user_role;
    
    -- Return success with user data
    RETURN QUERY SELECT 
        v_user_id, 
        v_user_full_name, 
        v_user_email, 
        v_user_role, 
        'Signup successful'::character varying;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- ADD COMMENT
-- ============================================
COMMENT ON FUNCTION sp_signup(character varying, character varying, character varying, character varying) 
IS 'Creates a new user account if email does not exist';

-- ============================================
-- TEST THE FUNCTION
-- ============================================
SELECT * FROM sp_signup('Test User', 'test123@example.com', 'hashed_password', '1234567890');