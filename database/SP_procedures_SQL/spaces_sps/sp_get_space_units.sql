-- Drop existing function if it exists
DROP FUNCTION IF EXISTS sp_get_space_units(UUID) CASCADE;

-- Create corrected stored procedure
CREATE OR REPLACE FUNCTION sp_get_space_units(
    p_space_id UUID
)
RETURNS JSON AS $$
DECLARE
    v_space_exists BOOLEAN;
    v_space_name VARCHAR;
    v_result JSON;
BEGIN
    -- Check if space exists and is active (fixed: qualify column name)
    SELECT 
        EXISTS(SELECT 1 FROM spaces WHERE id = p_space_id AND is_active = true),
        s.name 
    INTO v_space_exists, v_space_name
    FROM spaces s
    WHERE s.id = p_space_id;
    
    IF NOT v_space_exists THEN
        RETURN json_build_object(
            'success', false,
            'message', 'Space not found'
        );
    END IF;
    
    -- Get all units and build response
    SELECT json_build_object(
        'success', true,
        'space', json_build_object(
            'id', p_space_id,
            'name', v_space_name
        ),
        'count', COALESCE(COUNT(u.id), 0),
        'units', COALESCE(
            json_agg(
                json_build_object(
                    'id', u.id,
                    'unit_type', u.unit_type,
                    'total_capacity', u.total_capacity,
                    'hourly_rate', u.hourly_rate,
                    'daily_rate', u.daily_rate,
                    'monthly_rate', u.monthly_rate,
                    'is_active', u.is_active,
                    'created_at', u.created_at,
                    'updated_at', u.updated_at
                ) ORDER BY 
                    CASE u.unit_type
                        WHEN 'open_desk' THEN 1
                        WHEN 'meeting_room' THEN 2
                        WHEN 'private_office' THEN 3
                        WHEN 'conference_room' THEN 4
                        ELSE 5
                    END,
                    u.created_at ASC
            ), '[]'::json
        )
    ) INTO v_result
    FROM space_units u
    WHERE u.space_id = p_space_id AND u.is_active = true;
    
    RETURN v_result;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION sp_get_space_units(UUID) IS 'Get all units of a space with space information';