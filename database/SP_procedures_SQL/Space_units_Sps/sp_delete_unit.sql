-- ============================================
-- STORED PROCEDURE: sp_delete_unit
-- Purpose: Soft delete a space unit (mark as inactive)
-- Created: May 23, 2026
-- ============================================

DROP FUNCTION IF EXISTS sp_delete_unit(UUID, UUID, UUID) CASCADE;

CREATE OR REPLACE FUNCTION sp_delete_unit(
    p_unit_id UUID,
    p_space_id UUID,
    p_owner_id UUID
)
RETURNS JSON AS $$
DECLARE
    v_space_exists BOOLEAN;
    v_unit_exists BOOLEAN;
    v_unit_current_status BOOLEAN;
    v_updated_unit JSON;
BEGIN
    -- 1. Verify space ownership
    SELECT EXISTS(
        SELECT 1 FROM spaces 
        WHERE id = p_space_id 
        AND owner_id = p_owner_id
    ) INTO v_space_exists;
    
    IF NOT v_space_exists THEN
        RETURN json_build_object(
            'success', false,
            'message', 'Space not found or you are not the owner'
        );
    END IF;
    
    -- 2. Check if unit exists and get current status
    SELECT EXISTS(
        SELECT 1 FROM space_units 
        WHERE id = p_unit_id AND space_id = p_space_id
    ), COALESCE(
        (SELECT is_active FROM space_units 
         WHERE id = p_unit_id AND space_id = p_space_id),
        false
    ) INTO v_unit_exists, v_unit_current_status;
    
    -- 3. If unit doesn't exist
    IF NOT v_unit_exists THEN
        RETURN json_build_object(
            'success', false,
            'message', 'Unit not found in this space'
        );
    END IF;
    
    -- 4. If already inactive
    IF v_unit_current_status = false THEN
        RETURN json_build_object(
            'success', false,
            'message', 'Unit is already deleted/inactive'
        );
    END IF;
    
    -- 5. Soft delete the unit
    UPDATE space_units 
    SET is_active = false, 
        updated_at = CURRENT_TIMESTAMP 
    WHERE id = p_unit_id AND space_id = p_space_id
    RETURNING row_to_json(space_units.*) INTO v_updated_unit;
    
    -- 6. Return success
    RETURN json_build_object(
        'success', true,
        'message', 'Unit deleted successfully (soft delete)',
        'data', json_build_object(
            'unit_id', p_unit_id,
            'is_active', false,
            'deleted_at', to_char(CURRENT_TIMESTAMP, 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"')
        ),
        'unit', v_updated_unit
    );
    
EXCEPTION
    WHEN OTHERS THEN
        RETURN json_build_object(
            'success', false,
            'message', SQLERRM
        );
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION sp_delete_unit(UUID, UUID, UUID) IS 'Soft delete a space unit by marking is_active as false';