-- Drop existing function if it exists
DROP FUNCTION IF EXISTS sp_get_units_by_type(VARCHAR, INT) CASCADE;

-- Create correct function based on YOUR table structure
CREATE OR REPLACE FUNCTION sp_get_units_by_type(
    p_unit_type VARCHAR,
    p_limit INT DEFAULT 50
)
RETURNS TABLE(
    -- From space_units table
    id UUID,
    space_id UUID,
    unit_type VARCHAR,
    name VARCHAR,
    total_capacity INTEGER,
    hourly_rate NUMERIC,
    daily_rate NUMERIC,
    monthly_rate NUMERIC,
    images JSONB,
    duration VARCHAR,
    is_active BOOLEAN,
    created_at TIMESTAMP,
    updated_at TIMESTAMP,
    -- From spaces table
    space_name VARCHAR,
    city VARCHAR,
    address TEXT,
    is_verified BOOLEAN
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        su.id,
        su.space_id,
        su.unit_type,
        COALESCE(su.name, s.name) as name,
        su.total_capacity,
        su.hourly_rate,
        su.daily_rate,
        su.monthly_rate,
        su.images,
        su.duration,
        su.is_active,
        su.created_at,
        su.updated_at,
        s.name as space_name,
        s.city,
        s.address,
        s.is_verified
    FROM space_units su
    INNER JOIN spaces s ON s.id = su.space_id
    WHERE su.unit_type = p_unit_type
        AND su.is_active = true
        AND s.is_active = true
    ORDER BY s.is_verified DESC, su.daily_rate ASC
    LIMIT p_limit;
END;
$$ LANGUAGE plpgsql;

-- Add comment
COMMENT ON FUNCTION sp_get_units_by_type(VARCHAR, INT) IS 'Get all active space units by type';