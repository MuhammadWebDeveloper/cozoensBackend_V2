-- ============================================
-- CORRECTED STORED PROCEDURE: sp_create_space
-- (Removed cover_image and gallery_images)
-- ============================================
-- CORRECT DROP with 22 parameters (not 24)
DROP FUNCTION IF EXISTS sp_create_space(
    UUID,
    VARCHAR,
    TEXT,
    TEXT,
    VARCHAR,
    VARCHAR,
    TEXT,
    NUMERIC,
    NUMERIC,
    TIME,
    TIME,
    TEXT [],
    BOOLEAN,
    BOOLEAN,
    BOOLEAN,
    BOOLEAN,
    BOOLEAN,
    BOOLEAN,
    BOOLEAN,
    TEXT,
    TEXT,
    TEXT
) CASCADE;
-- Create the function
CREATE OR REPLACE FUNCTION sp_create_space(
        p_owner_id UUID,
        p_name VARCHAR,
        p_description TEXT,
        p_address TEXT,
        p_city VARCHAR,
        p_area VARCHAR,
        p_google_maps_link TEXT,
        p_latitude NUMERIC,
        p_longitude NUMERIC,
        p_opening_time TIME,
        p_closing_time TIME,
        p_working_days TEXT [],
        p_has_wifi BOOLEAN,
        p_has_ac BOOLEAN,
        p_has_coffee BOOLEAN,
        p_has_printer BOOLEAN,
        p_has_parking BOOLEAN,
        p_has_security BOOLEAN,
        p_has_backup_power BOOLEAN,
        p_cancellation_policy TEXT,
        p_refund_policy TEXT,
        p_late_arrival_policy TEXT
    ) RETURNS JSON AS $$
DECLARE v_new_space JSON;
BEGIN -- Validate required fields
IF p_name IS NULL
OR p_city IS NULL THEN RETURN json_build_object(
    'success',
    false,
    'message',
    'Space name and city are required'
);
END IF;
-- Insert the new space
INSERT INTO spaces (
        owner_id,
        name,
        description,
        address,
        city,
        area,
        google_maps_link,
        latitude,
        longitude,
        opening_time,
        closing_time,
        working_days,
        has_wifi,
        has_ac,
        has_coffee,
        has_printer,
        has_parking,
        has_security,
        has_backup_power,
        cancellation_policy,
        refund_policy,
        late_arrival_policy,
        is_active,
        created_at,
        updated_at
    )
VALUES (
        p_owner_id,
        p_name,
        p_description,
        p_address,
        p_city,
        p_area,
        p_google_maps_link,
        p_latitude,
        p_longitude,
        p_opening_time,
        p_closing_time,
        p_working_days,
        COALESCE(p_has_wifi, false),
        COALESCE(p_has_ac, false),
        COALESCE(p_has_coffee, false),
        COALESCE(p_has_printer, false),
        COALESCE(p_has_parking, false),
        COALESCE(p_has_security, false),
        COALESCE(p_has_backup_power, false),
        p_cancellation_policy,
        p_refund_policy,
        p_late_arrival_policy,
        true,
        CURRENT_TIMESTAMP,
        CURRENT_TIMESTAMP
    )
RETURNING row_to_json(spaces.*) INTO v_new_space;
-- Return success with the new space
RETURN json_build_object(
    'success',
    true,
    'message',
    'Space created successfully',
    'space',
    v_new_space
);
EXCEPTION
WHEN OTHERS THEN RETURN json_build_object(
    'success',
    false,
    'message',
    SQLERRM
);
END;
$$ LANGUAGE plpgsql;
COMMENT ON FUNCTION sp_create_space(
    UUID,
    VARCHAR,
    TEXT,
    TEXT,
    VARCHAR,
    VARCHAR,
    TEXT,
    NUMERIC,
    NUMERIC,
    TIME,
    TIME,
    TEXT [],
    BOOLEAN,
    BOOLEAN,
    BOOLEAN,
    BOOLEAN,
    BOOLEAN,
    BOOLEAN,
    BOOLEAN,
    TEXT,
    TEXT,
    TEXT
) IS 'Create a new space for a user';