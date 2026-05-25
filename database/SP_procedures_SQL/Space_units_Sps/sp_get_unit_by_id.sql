-- ============================================
-- STORED PROCEDURE: sp_get_unit_by_id
-- Purpose: Get unit by both space ID and unit ID (double verification)
-- Created: May 23, 2026
-- ============================================

CREATE OR REPLACE FUNCTION sp_get_unit_by_id(
    p_unit_id UUID,
    p_space_id UUID
)
RETURNS JSON AS $$
DECLARE
    v_result JSON;
BEGIN
    SELECT json_build_object(
        'id', su.id,
        'space_id', su.space_id,
        'unit_type', su.unit_type,
        'name', su.name,
        'total_capacity', su.total_capacity,
        'hourly_rate', su.hourly_rate,
        'daily_rate', su.daily_rate,
        'monthly_rate', su.monthly_rate,
        'images', su.images,
        'duration', su.duration,
        'is_active', su.is_active,
        'created_at', su.created_at,
        'updated_at', su.updated_at,
        'space_name', s.name,
        'space_city', s.city,
        'address', s.address,
        'opening_time', s.opening_time,
        'closing_time', s.closing_time,
        'space_amenities', json_build_object(
            'wifi', s.has_wifi,
            'ac', s.has_ac,
            'coffee', s.has_coffee,
            'printer', s.has_printer,
            'parking', s.has_parking,
            'security', s.has_security,
            'backup_power', s.has_backup_power
        )
    ) INTO v_result
    FROM space_units su
    JOIN spaces s ON s.id = su.space_id
    WHERE su.id = p_unit_id 
        AND su.space_id = p_space_id
        AND su.is_active = true
        AND s.is_active = true;
    
    RETURN v_result;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION sp_get_unit_by_id(UUID, UUID) IS 'Get unit by both unit ID and space ID with double verification';