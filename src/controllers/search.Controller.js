import { pool } from '../config/db.config.js';

const SearchSpaces = async (req, res) => {
    try {
        const { destination, type } = req.query;

        // Build dynamic WHERE clauses
        const conditions = [
            'su.is_active = true',
            's.is_active = true'
        ];
        const values = [];
        let paramIndex = 1;

        // Filter by destination (city OR address, case-insensitive)
        if (destination && destination.trim() !== '') {
            conditions.push(
                `(s.city ILIKE $${paramIndex} OR s.address ILIKE $${paramIndex} OR s.name ILIKE $${paramIndex})`
            );
            values.push(`%${destination.trim()}%`);
            paramIndex++;
        }

        // Filter by unit type
        if (type && type.trim() !== '') {
            conditions.push(`su.unit_type = $${paramIndex}`);
            values.push(type.trim());
            paramIndex++;
        }

        const whereClause = conditions.length > 0
            ? 'WHERE ' + conditions.join(' AND ')
            : '';

        const query = `
            SELECT
                su.id,
                su.space_id,
                su.unit_type,
                su.name,
                su.total_capacity,
                su.hourly_rate,
                su.daily_rate,
                su.monthly_rate,
                su.duration,
                su.is_active,
                s.name AS space_name,
                s.city,
                s.address,
                s.is_verified,
                COALESCE(
                    (
                        SELECT json_agg(
                            json_build_object(
                                'id', ui.id,
                                'image_base64', ui.image_base64,
                                'display_order', ui.display_order,
                                'is_primary', ui.is_primary
                            )
                        )
                        FROM (
                            SELECT * FROM unit_images 
                            WHERE unit_id = su.id 
                            ORDER BY is_primary DESC, display_order ASC 
                            LIMIT 1
                        ) ui
                    ),
                    '[]'::json
                ) as images
            FROM space_units su
            INNER JOIN spaces s ON su.space_id = s.id
            ${whereClause}
            ORDER BY
                s.is_verified DESC,
                su.hourly_rate ASC NULLS LAST
            LIMIT 50
        `;

        const result = await pool.query(query, values);

        // Format the response
        const formattedUnits = result.rows.map(unit => ({
            id: unit.id,
            space_id: unit.space_id,
            unit_type: unit.unit_type,
            name: unit.name,
            space_name: unit.space_name,
            city: unit.city,
            address: unit.address,
            total_capacity: unit.total_capacity ? parseInt(unit.total_capacity) : null,
            hourly_rate: unit.hourly_rate ? parseFloat(unit.hourly_rate) : null,
            daily_rate: unit.daily_rate ? parseFloat(unit.daily_rate) : null,
            monthly_rate: unit.monthly_rate ? parseFloat(unit.monthly_rate) : null,
            images: unit.images || [],
            duration: unit.duration,
            is_active: unit.is_active,
            is_verified: unit.is_verified
        }));

        return res.status(200).json({
            success: true,
            count: formattedUnits.length,
            units: formattedUnits
        });

    } catch (error) {
        console.error('Search error:', error);
        return res.status(500).json({
            success: false,
            message: 'Search failed. Please try again.',
            error: error.message
        });
    }
};

export default SearchSpaces;