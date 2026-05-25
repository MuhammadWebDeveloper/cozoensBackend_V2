CREATE OR REPLACE FUNCTION public.sp_get_space_by_id(p_space_id uuid) RETURNS json LANGUAGE plpgsql AS $function$
DECLARE v_result JSON;
BEGIN
SELECT json_build_object(
        'id',
        s.id,
        'owner_id',
        s.owner_id,
        'owner_name',
        u.full_name,
        'name',
        s.name,
        'description',
        s.description,
        'address',
        s.address,
        'city',
        s.city,
        'area',
        s.area,
        'google_maps_link',
        s.google_maps_link,
        'latitude',
        s.latitude,
        'longitude',
        s.longitude,
        'opening_time',
        s.opening_time,
        'closing_time',
        s.closing_time,
        'working_days',
        s.working_days,
        'has_wifi',
        s.has_wifi,
        'has_ac',
        s.has_ac,
        'has_coffee',
        s.has_coffee,
        'has_printer',
        s.has_printer,
        'has_parking',
        s.has_parking,
        'has_security',
        s.has_security,
        'has_backup_power',
        s.has_backup_power,
        'cover_image',
        s.cover_image,
        'gallery_images',
        s.gallery_images,
        'cancellation_policy',
        s.cancellation_policy,
        'refund_policy',
        s.refund_policy,
        'late_arrival_policy',
        s.late_arrival_policy,
        'is_verified',
        s.is_verified,
        'is_active',
        s.is_active,
        'created_at',
        s.created_at,
        'updated_at',
        s.updated_at,
        'units',
        COALESCE(
            (
                SELECT json_agg(
                        json_build_object(
                            'id',
                            su.id,
                            'unit_type',
                            su.unit_type,
                            'name',
                            su.name,
                            'total_capacity',
                            su.total_capacity,
                            'hourly_rate',
                            su.hourly_rate,
                            'daily_rate',
                            su.daily_rate,
                            'monthly_rate',
                            su.monthly_rate,
                            'images',
                            su.images,
                            'duration',
                            su.duration,
                            'is_active',
                            su.is_active,
                            'created_at',
                            su.created_at,
                            'updated_at',
                            su.updated_at
                        )
                        ORDER BY su.created_at ASC
                    )
                FROM space_units su
                WHERE su.space_id = s.id
                    AND su.is_active = true
            ),
            '[]'::json
        )
    ) INTO v_result
FROM spaces s
    LEFT JOIN users u ON u.id = s.owner_id
WHERE s.id = p_space_id
    AND s.is_active = true;
RETURN v_result;
END;
$function$