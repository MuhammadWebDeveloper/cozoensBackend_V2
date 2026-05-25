-- ============================================
-- STORED PROCEDURE: sp_delete_space
-- Purpose: Soft delete a space (check ownership first)
-- Created: May 23, 2026
-- ============================================

CREATE OR REPLACE FUNCTION sp_delete_space(
    p_space_id UUID,
    p_owner_id UUID
)
RETURNS JSON AS $$
DECLARE
    v_space_exists BOOLEAN;
    v_result JSON;
BEGIN
    -- Check if space exists and belongs to owner
    SELECT EXISTS(
        SELECT 1 FROM spaces 
        WHERE id = p_space_id 
        AND owner_id = p_owner_id
        AND is_active = true
    ) INTO v_space_exists;
    
    IF NOT v_space_exists THEN
        RETURN json_build_object(
            'success', false,
            'message', 'Space not found or not authorized'
        );
    END IF;
    
    -- Soft delete the space
    UPDATE spaces 
    SET is_active = false, 
        updated_at = CURRENT_TIMESTAMP 
    WHERE id = p_space_id;
    
    RETURN json_build_object(
        'success', true,
        'message', 'Space deleted successfully'
    );
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION sp_delete_space(UUID, UUID) IS 'Soft delete a space after verifying ownership';