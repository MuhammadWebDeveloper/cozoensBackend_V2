-- ============================================
-- STORED PROCEDURE: sp_get_all_spaces
-- Purpose: Get all active spaces with optional filters (city, unit_type)
-- Created: May 23, 2026
-- ============================================

DROP FUNCTION IF EXISTS sp_get_all_spaces(VARCHAR, VARCHAR) CASCADE;

CREATE OR REPLACE FUNCTION sp_get_all_spaces(
    p_city VARCHAR DEFAULT NULL,
    p_type VARCHAR DEFAULT NULL
)
RETURNS TABLE(
    id UUID,
    name VARCHAR,
    description TEXT,
    city VARCHAR,
    area VARCHAR,
    cover_image TEXT,
    opening_time TIME,
    closing_time TIME,
    has_wifi BOOLEAN,
    has_ac BOOLEAN,
    has_parking BOOLEAN,
    is_verified BOOLEAN,
    units JSON
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        s.id,
        s.name,
        s.description,
        s.city,
        s.area,
        s.cover_image,
        s.opening_time,
        s.closing_time,
        s.has_wifi,
        s.has_ac,
        s.has_parking,
        s.is_verified,
        COALESCE(
            (SELECT json_agg(
                json_build_object(
                    'unit_type', su.unit_type,
                    'total_capacity', su.total_capacity,
                    'hourly_rate', su.hourly_rate,
                    'daily_rate', su.daily_rate,
                    'monthly_rate', su.monthly_rate
                )
                ORDER BY su.created_at ASC
            ) FROM space_units su 
              WHERE su.space_id = s.id 
                AND su.is_active = true
                AND (p_type IS NULL OR su.unit_type = p_type)),
            '[]'::json
        ) AS units
    FROM spaces s
    WHERE s.is_active = true
        AND (p_city IS NULL OR LOWER(s.city) = LOWER(p_city))
    ORDER BY s.created_at DESC;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION sp_get_all_spaces(VARCHAR, VARCHAR) IS 'Get all active spaces with optional city and unit type filters';