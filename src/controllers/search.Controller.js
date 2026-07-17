// backend/controllers/search.controller.js
import { pool } from '../config/db.config.js';

const SearchSpaces = async (req, res) => {
    try {
        const { destination, type } = req.query;

        console.log('🔍 Search request:', { destination, type });

        // Call stored procedure with default values
        const result = await pool.query(
            `SELECT * FROM search_spaces_simple(
                $1::VARCHAR, 
                $2::VARCHAR, 
                $3::INTEGER, 
                $4::INTEGER
            )`,
            [
                destination || null,
                type || null,
                50,  // LIMIT
                0    // OFFSET
            ]
        );

        const rows = result.rows;

        // Format the response exactly like the original
        const formattedUnits = rows.map(row => ({
            id: row.id,
            space_id: row.space_id,
            unit_type: row.unit_type,
            name: row.name,
            space_name: row.space_name,
            city: row.city,
            address: row.address,
            total_capacity: row.total_capacity ? parseInt(row.total_capacity) : null,
            hourly_rate: row.hourly_rate ? parseFloat(row.hourly_rate) : null,
            daily_rate: row.daily_rate ? parseFloat(row.daily_rate) : null,
            monthly_rate: row.monthly_rate ? parseFloat(row.monthly_rate) : null,
            images: row.images || [],
            duration: row.duration,
            is_active: row.is_active,
            is_verified: row.is_verified
        }));

        return res.status(200).json({
            success: true,
            count: formattedUnits.length,
            units: formattedUnits
        });

    } catch (error) {
        console.error('❌ Search error:', error);
        return res.status(500).json({
            success: false,
            message: 'Search failed. Please try again.',
            error: error.message
        });
    }
};

export default SearchSpaces;