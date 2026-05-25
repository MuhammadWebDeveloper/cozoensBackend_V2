-- Drop existing function
DROP FUNCTION IF EXISTS sp_get_my_spaces(UUID);
-- Create function that returns JSON (more flexible)
CREATE OR REPLACE FUNCTION sp_get_my_spaces_unit(p_owner_id UUID) RETURNS JSON AS $$
DECLARE v_result JSON;
BEGIN
SELECT json_agg(row_to_json(s)) INTO v_result
FROM (
        SELECT s.id,
            s.name,
            s.description,
            s.address,
            s.city,
            s.area,
            s.google_maps_link,
            s.latitude,
            s.longitude,
            s.opening_time,
            s.closing_time,
            s.working_days,
            s.has_wifi,
            s.has_ac,
            s.has_coffee,
            s.has_printer,
            s.has_parking,
            s.has_security,
            s.has_backup_power,
            s.cancellation_policy,
            s.refund_policy,
            s.late_arrival_policy,
            s.is_active,
            s.created_at,
            s.updated_at
        FROM spaces s
        WHERE s.owner_id = p_owner_id
        ORDER BY s.created_at DESC
    ) s;
RETURN COALESCE(v_result, '[]'::json);
END;
$$ LANGUAGE plpgsql;