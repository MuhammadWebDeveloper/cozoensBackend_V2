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

        // Call stored procedure
        const result = await pool.query(
            `SELECT toggle_favorite($1::UUID, $2::UUID) as result`,
            [user_id, unitId]
        );

        const response = result.rows[0].result;

        console.log('📊 SP Response:', JSON.stringify(response, null, 2));

        if (!response.success) {
            return res.status(404).json({
                success: false,
                message: response.message
            });
        }

        return res.json({
            success: true,
            action: response.action,
            message: response.message,
            isFavorite: response.isFavorite
        });
    } catch (error) {
        console.error('❌ Toggle favorite error:', error);
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

        // Call stored procedure
        const result = await pool.query(
            `SELECT check_favorite($1::UUID, $2::UUID) as result`,
            [user_id, unitId]
        );

        const response = result.rows[0].result;

        if (!response.success) {
            return res.status(500).json({
                success: false,
                message: response.message
            });
        }

        return res.json({
            success: true,
            isFavorite: response.isFavorite
        });
    } catch (error) {
        console.error('❌ Check favorite error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to check favorite status',
            error: error.message
        });
    }
};

// ============================================
// GET USER FAVORITES
// ============================================
export const getUserFavorites = async (req, res) => {
    try {
        const userId = req.user.id;

        // Call stored procedure
        const result = await pool.query(
            `SELECT get_user_favorites($1::UUID) as result`,
            [userId]
        );

        const response = result.rows[0].result;

        console.log('📊 SP Response:', JSON.stringify(response, null, 2));

        if (!response.success) {
            return res.status(500).json({
                success: false,
                message: response.message
            });
        }

        return res.status(200).json({
            success: true,
            count: response.count || 0,
            favorites: response.favorites || []
        });
    } catch (error) {
        console.error("❌ Get favorites error:", error);
        return res.status(500).json({
            success: false,
            message: "Server error: " + error.message
        });
    }
};

// ============================================
// GET FAVORITE UNIT DETAILS
// ============================================
export const getFavoriteUnitDetails = async (req, res) => {
    try {
        const { unitId } = req.params;
        const userId = req.user.id;

        if (!unitId) {
            return res.status(400).json({
                success: false,
                message: "Unit ID is required"
            });
        }

        // Call stored procedure
        const result = await pool.query(
            `SELECT get_favorite_unit_details($1::UUID, $2::UUID) as result`,
            [userId, unitId]
        );

        const response = result.rows[0].result;

        console.log('📊 SP Response:', JSON.stringify(response, null, 2));

        if (!response.success) {
            if (response.message === 'Not authorized to view this unit') {
                return res.status(403).json({
                    success: false,
                    message: response.message
                });
            }
            if (response.message === 'Unit not found') {
                return res.status(404).json({
                    success: false,
                    message: response.message
                });
            }
            return res.status(500).json({
                success: false,
                message: response.message
            });
        }

        return res.status(200).json({
            success: true,
            unit: response.unit
        });
    } catch (error) {
        console.error("❌ Get favorite unit details error:", error);
        return res.status(500).json({
            success: false,
            message: "Server error: " + error.message
        });
    }
};

// ============================================
// GET UNIT IMAGES ONLY
// ============================================
export const getUnitImagesOnly = async (req, res) => {
    try {
        const { unitId } = req.params;

        if (!unitId) {
            return res.status(400).json({
                success: false,
                message: "Unit ID is required"
            });
        }

        // Call stored procedure
        const result = await pool.query(
            `SELECT get_unit_images($1::UUID) as result`,
            [unitId]
        );

        const response = result.rows[0].result;

        console.log('📊 SP Response:', JSON.stringify(response, null, 2));

        if (!response.success) {
            return res.status(500).json({
                success: false,
                message: response.message
            });
        }

        return res.status(200).json({
            success: true,
            images: response.images || [],
            count: response.count || 0
        });
    } catch (error) {
        console.error("❌ getUnitImagesOnly error:", error.message);
        return res.status(500).json({
            success: false,
            message: "Failed to load images",
            error: error.message
        });
    }
};

// ============================================
// GET UNIT FAVORITE COUNT
// ============================================
export const getUnitFavoriteCount = async (req, res) => {
    try {
        const { unitId } = req.params;

        if (!unitId) {
            return res.status(400).json({
                success: false,
                message: "Unit ID is required"
            });
        }

        // Call stored procedure
        const result = await pool.query(
            `SELECT get_unit_favorite_count($1::UUID) as result`,
            [unitId]
        );

        const response = result.rows[0].result;

        if (!response.success) {
            return res.status(500).json({
                success: false,
                message: response.message
            });
        }

        return res.json({
            success: true,
            unit_id: response.unit_id,
            count: response.count
        });
    } catch (error) {
        console.error('❌ Get favorite count error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to get favorite count',
            error: error.message
        });
    }
};