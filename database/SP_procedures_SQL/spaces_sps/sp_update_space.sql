-- ============================================
-- STORED PROCEDURE: sp_update_space
-- Purpose: Update space details with ownership verification
-- ============================================

CREATE OR REPLACE FUNCTION sp_update_space(
    p_space_id UUID,
    p_owner_id UUID,
    p_name VARCHAR,
    p_description TEXT,
    p_address TEXT,
    p_city VARCHAR,
    p_area VARCHAR,
    p_opening_time TIME,
    p_closing_time TIME,
    p_working_days TEXT[],
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
)
RETURNS JSON AS $$
DECLARE
    v_space_exists BOOLEAN;
    v_updated_space JSON;
BEGIN
    -- Check if space exists and belongs to owner
    SELECT EXISTS(
        SELECT 1 FROM spaces 
        WHERE id = p_space_id 
        AND owner_id = p_owner_id
    ) INTO v_space_exists;
    
    IF NOT v_space_exists THEN
        RETURN json_build_object(
            'success', false,
            'message', 'Space not found or not authorized'
        );
    END IF;
    
    -- Update the space
    UPDATE spaces SET
        name = COALESCE(p_name, name),
        description = COALESCE(p_description, description),
        address = COALESCE(p_address, address),
        city = COALESCE(p_city, city),
        area = COALESCE(p_area, area),
        opening_time = COALESCE(p_opening_time, opening_time),
        closing_time = COALESCE(p_closing_time, closing_time),
        working_days = COALESCE(p_working_days, working_days),
        has_wifi = COALESCE(p_has_wifi, has_wifi),
        has_ac = COALESCE(p_has_ac, has_ac),
        has_coffee = COALESCE(p_has_coffee, has_coffee),
        has_printer = COALESCE(p_has_printer, has_printer),
        has_parking = COALESCE(p_has_parking, has_parking),
        has_security = COALESCE(p_has_security, has_security),
        has_backup_power = COALESCE(p_has_backup_power, has_backup_power),
        cancellation_policy = COALESCE(p_cancellation_policy, cancellation_policy),
        refund_policy = COALESCE(p_refund_policy, refund_policy),
        late_arrival_policy = COALESCE(p_late_arrival_policy, late_arrival_policy),
        updated_at = CURRENT_TIMESTAMP
    WHERE id = p_space_id
    RETURNING row_to_json(spaces.*) INTO v_updated_space;
    
    RETURN json_build_object(
        'success', true,
        'message', 'Space updated successfully',
        'space', v_updated_space
    );
END;
$$ LANGUAGE plpgsql;