-- ============================================
-- STORED PROCEDURE: sp_get_unit_details
-- Purpose: Get complete unit details with space info, amenities, and policies
-- Created: May 23, 2026
-- ============================================

CREATE OR REPLACE FUNCTION sp_get_unit_details(
    p_unit_id UUID
)
RETURNS JSON AS $$
DECLARE
    v_result JSON;
    v_unit_type VARCHAR;
BEGIN
    -- First check if unit exists
    SELECT su.unit_type INTO v_unit_type
    FROM space_units su
    WHERE su.id = p_unit_id 
        AND su.is_active = true;
    
    IF v_unit_type IS NULL THEN
        RETURN NULL;
    END IF;
    
    -- Build the complete JSON response
    SELECT json_build_object(
        'id', su.id,
        'name', su.name,
        'unit_type', su.unit_type,
        'total_capacity', su.total_capacity,
        'hourly_rate', su.hourly_rate,
        'daily_rate', su.daily_rate,
        'monthly_rate', su.monthly_rate,
        'images', su.images,
        'duration', su.duration,
        'is_active', su.is_active,
        'created_at', su.created_at,
        'updated_at', su.updated_at,
        'space', json_build_object(
            'id', s.id,
            'name', s.name,
            'description', s.description,
            'city', s.city,
            'area', s.area,
            'address', s.address,
            'google_maps_link', s.google_maps_link,
            'latitude', s.latitude,
            'longitude', s.longitude,
            'opening_time', s.opening_time,
            'closing_time', s.closing_time,
            'working_days', s.working_days,
            'cover_image', s.cover_image,
            'gallery_images', s.gallery_images,
            'is_verified', s.is_verified,
            'owner_id', s.owner_id
        ),
        'space_amenities', json_build_object(
            'wifi', s.has_wifi,
            'ac', s.has_ac,
            'coffee', s.has_coffee,
            'printer', s.has_printer,
            'parking', s.has_parking,
            'security', s.has_security,
            'backup_power', s.has_backup_power
        ),
        'policies', json_build_object(
            'cancellation', s.cancellation_policy,
            'refund', s.refund_policy,
            'late_arrival', s.late_arrival_policy
        ),
        'display_name', CASE su.unit_type
            WHEN 'open_desk' THEN 'Open Desk'
            WHEN 'dedicated_desk' THEN 'Dedicated Desk'
            WHEN 'private_cabin' THEN 'Private Cabin'
            WHEN 'meeting_room' THEN 'Meeting Room'
            ELSE su.unit_type
        END
    ) INTO v_result
    FROM space_units su
    JOIN spaces s ON s.id = su.space_id
    WHERE su.id = p_unit_id 
        AND su.is_active = true 
        AND s.is_active = true;
    
    RETURN v_result;
END;
$$ LANGUAGE plpgsql;

-- Add comment
COMMENT ON FUNCTION sp_get_unit_details(UUID) IS 'Get complete unit details with space, amenities, and policies';