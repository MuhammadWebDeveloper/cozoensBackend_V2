DROP FUNCTION IF EXISTS sp_get_my_spaces(UUID) CASCADE;

CREATE OR REPLACE FUNCTION sp_get_my_spaces(p_owner_id UUID)
RETURNS JSON AS $$
DECLARE
    v_result JSON;
BEGIN
    SELECT json_agg(
        json_build_object(
            'id', s.id,
            'name', s.name,
            'description', s.description,
            'address', s.address,
            'city', s.city,
            'area', s.area,
            'google_maps_link', s.google_maps_link,
            'latitude', s.latitude,
            'longitude', s.longitude,
            'opening_time', s.opening_time,
            'closing_time', s.closing_time,
            'working_days', s.working_days,
            'has_wifi', s.has_wifi,
            'has_ac', s.has_ac,
            'has_coffee', s.has_coffee,
            'has_printer', s.has_printer,
            'has_parking', s.has_parking,
            'has_security', s.has_security,
            'has_backup_power', s.has_backup_power,
            'cancellation_policy', s.cancellation_policy,
            'refund_policy', s.refund_policy,
            'late_arrival_policy', s.late_arrival_policy,
            'is_active', s.is_active,
            'created_at', s.created_at,
            'updated_at', s.updated_at,
            'units', COALESCE(
                (SELECT json_agg(
                    json_build_object(
                        'id', u.id,
                        'unit_type', u.unit_type,
                        'name', u.name,
                        'total_capacity', u.total_capacity,
                        'hourly_rate', u.hourly_rate,
                        'daily_rate', u.daily_rate,
                        'monthly_rate', u.monthly_rate,
                        'images', u.images,
                        'duration', u.duration,
                        'is_active', u.is_active,
                        'created_at', u.created_at,
                        'updated_at', u.updated_at
                    )
                ) FROM (
                    SELECT * FROM space_units u2 
                    WHERE u2.space_id = s.id AND u2.is_active = true
                    ORDER BY u2.created_at ASC
                ) u),
                '[]'::json
            )
        )
        ORDER BY s.created_at DESC
    )
    INTO v_result
    FROM spaces s
    WHERE s.owner_id = p_owner_id;
    
    RETURN COALESCE(v_result, '[]'::json);
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION sp_get_my_spaces(UUID) IS 'Get all spaces owned by a user with their units as JSON';

