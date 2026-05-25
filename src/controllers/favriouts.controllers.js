// Backend/src/controllers/favorite.controller.js
import { pool } from '../config/db.config.js';

// ============================================
// TOGGLE FAVORITE (Add/Remove)
// ============================================
export const toggleFavorite = async (req, res) => {
    try {
        const { unitId } = req.params;
        const user_id = req.user.id;

        if (!unitId) {
            return res.status(400).json({
                success: false,
                message: 'Unit ID is required'
            });
        }

        // Check if unit exists
        const unitCheck = await pool.query(
            'SELECT id FROM space_units WHERE id = $1 AND is_active = true',
            [unitId]
        );

        if (unitCheck.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Unit not found'
            });
        }

        // Check if already favorited
        const checkQuery = await pool.query(
            'SELECT id FROM favorites WHERE user_id = $1 AND unit_id = $2',
            [user_id, unitId]
        );

        if (checkQuery.rows.length > 0) {
            // Remove from favorites
            await pool.query(
                'DELETE FROM favorites WHERE user_id = $1 AND unit_id = $2',
                [user_id, unitId]
            );

            return res.json({
                success: true,
                action: 'unliked',
                message: 'Removed from favorites',
                isFavorite: false
            });
        } else {
            // Add to favorites
            await pool.query(
                'INSERT INTO favorites (user_id, unit_id) VALUES ($1, $2)',
                [user_id, unitId]
            );

            return res.json({
                success: true,
                action: 'liked',
                message: 'Added to favorites',
                isFavorite: true
            });
        }
    } catch (error) {
        console.error('Toggle favorite error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to toggle favorite',
            error: error.message
        });
    }
};

// ============================================
// CHECK IF UNIT IS FAVORITED
// ============================================
export const checkFavorite = async (req, res) => {
    try {
        const { unitId } = req.params;
        const user_id = req.user.id;

        const result = await pool.query(
            'SELECT EXISTS(SELECT 1 FROM favorites WHERE user_id = $1 AND unit_id = $2) as is_favorite',
            [user_id, unitId]
        );

        return res.json({
            success: true,
            isFavorite: result.rows[0].is_favorite
        });
    } catch (error) {
        console.error('Check favorite error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to check favorite status',
            error: error.message
        });
    }
};

// ============================================
// GET USER'S FAVORITE UNITS
// ============================================
export const getUserFavorites = async (req, res) => {
    try {
        const userId = req.user.id;

        const query = `
            SELECT 
                f.id as favorite_id,
                f.created_at as favorited_at,
                u.id as unit_id,
                u.unit_type,
                u.name as unit_name,
                u.total_capacity,
                u.hourly_rate,
                u.daily_rate,
                u.monthly_rate,
                u.images,
                u.is_active as unit_active,
                u.duration,
                s.id as space_id,
                s.name as space_name,
                s.city,
                s.area,
                s.address,
                s.description as space_description
            FROM favorites f
            INNER JOIN space_units u ON u.id = f.unit_id
            INNER JOIN spaces s ON s.id = u.space_id
            WHERE f.user_id = $1
            ORDER BY f.created_at DESC
        `;

        const result = await pool.query(query, [userId]);

        const favorites = result.rows.map(row => ({
            favorite_id: row.favorite_id,
            favorited_at: row.favorited_at,
            unit: {
                id: row.unit_id,
                unit_type: row.unit_type,
                name: row.unit_name,
                total_capacity: row.total_capacity,
                hourly_rate: row.hourly_rate ? parseFloat(row.hourly_rate) : null,
                daily_rate: row.daily_rate ? parseFloat(row.daily_rate) : null,
                monthly_rate: row.monthly_rate ? parseFloat(row.monthly_rate) : null,
                images: row.images || [],
                duration: row.duration,
                is_active: row.unit_active
            },
            space: {
                id: row.space_id,
                name: row.space_name,
                city: row.city,
                area: row.area,
                address: row.address,
                description: row.space_description
            }
        }));

        return res.json({
            success: true,
            count: favorites.length,
            favorites: favorites
        });
    } catch (error) {
        console.error("Get favorites error:", error);
        return res.status(500).json({
            success: false,
            message: "Server error: " + error.message
        });
    }
};

// ============================================
// GET FAVORITE COUNT FOR A UNIT
// ============================================
export const getUnitFavoriteCount = async (req, res) => {
    try {
        const { unitId } = req.params;

        const result = await pool.query(
            'SELECT COUNT(*) as count FROM favorites WHERE unit_id = $1',
            [unitId]
        );

        return res.json({
            success: true,
            unit_id: unitId,
            count: parseInt(result.rows[0].count)
        });
    } catch (error) {
        console.error('Get favorite count error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to get favorite count',
            error: error.message
        });
    }
};