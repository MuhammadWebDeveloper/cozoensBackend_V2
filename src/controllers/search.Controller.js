import { pool } from '../config/db.config.js'; // ✅ Named import with curly braces

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
        su.images,
        su.hourly_rate,
        su.daily_rate,
        su.monthly_rate,
        s.city,
        s.address,
        s.name AS space_name
    FROM space_units su
    INNER JOIN spaces s ON su.space_id = s.id
    ${whereClause}
    ORDER BY
        s.is_verified DESC,
        su.hourly_rate ASC NULLS LAST
`;

        const result = await pool.query(query, values);

        return res.status(200).json({
            success: true,
            count: result.rows.length,
            units: result.rows
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