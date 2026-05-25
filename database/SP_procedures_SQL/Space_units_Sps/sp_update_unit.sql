-- Drop existing function
DROP FUNCTION IF EXISTS sp_update_unit(UUID, UUID, UUID, VARCHAR, VARCHAR, INTEGER, NUMERIC, NUMERIC, NUMERIC, JSONB, VARCHAR, BOOLEAN) CASCADE;

-- Create updated version with -999 handling
CREATE OR REPLACE FUNCTION sp_update_unit(
    p_unit_id UUID,
    p_space_id UUID,
    p_owner_id UUID,
    p_name VARCHAR,
    p_unit_type VARCHAR,
    p_total_capacity INTEGER,
    p_hourly_rate NUMERIC,
    p_daily_rate NUMERIC,
    p_monthly_rate NUMERIC,
    p_images JSONB,
    p_duration VARCHAR,
    p_is_active BOOLEAN
)
RETURNS JSON AS $$
DECLARE
    v_space_exists BOOLEAN;
    v_unit_exists BOOLEAN;
    v_updated_unit JSON;
BEGIN
    -- Verify space ownership
    SELECT EXISTS(
        SELECT 1 FROM spaces 
        WHERE id = p_space_id 
        AND owner_id = p_owner_id 
        AND is_active = true
    ) INTO v_space_exists;
    
    IF NOT v_space_exists THEN
        RETURN json_build_object(
            'success', false,
            'message', 'Space not found or you are not the owner'
        );
    END IF;
    
    -- Verify unit exists
    SELECT EXISTS(
        SELECT 1 FROM space_units 
        WHERE id = p_unit_id AND space_id = p_space_id
    ) INTO v_unit_exists;
    
    IF NOT v_unit_exists THEN
        RETURN json_build_object(
            'success', false,
            'message', 'Unit not found in this space'
        );
    END IF;
    
    -- Update with special handling for -999 (means "set to NULL")
    UPDATE space_units SET
        name = COALESCE(p_name, name),
        unit_type = COALESCE(p_unit_type, unit_type),
        total_capacity = COALESCE(p_total_capacity, total_capacity),
        hourly_rate = CASE 
            WHEN p_hourly_rate = -999 THEN NULL 
            ELSE COALESCE(p_hourly_rate, hourly_rate) 
        END,
        daily_rate = CASE 
            WHEN p_daily_rate = -999 THEN NULL 
            ELSE COALESCE(p_daily_rate, daily_rate) 
        END,
        monthly_rate = CASE 
            WHEN p_monthly_rate = -999 THEN NULL 
            ELSE COALESCE(p_monthly_rate, monthly_rate) 
        END,
        images = COALESCE(p_images, images),
        duration = COALESCE(p_duration, duration),
        is_active = COALESCE(p_is_active, is_active),
        updated_at = CURRENT_TIMESTAMP
    WHERE id = p_unit_id AND space_id = p_space_id
    RETURNING row_to_json(space_units.*) INTO v_updated_unit;
    
    RETURN json_build_object(
        'success', true,
        'message', 'Unit updated successfully',
        'unit', v_updated_unit
    );
    
EXCEPTION
    WHEN unique_violation THEN
        RETURN json_build_object(
            'success', false,
            'message', 'This unit type already exists for this space'
        );
    WHEN OTHERS THEN
        RETURN json_build_object(
            'success', false,
            'message', SQLERRM
        );
END;
$$ LANGUAGE plpgsql;