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
// export const getUserFavorites = async (req, res) => {
//     try {
//         const userId = req.user.id;

//         const query = `
//             SELECT 
//                 f.id as favorite_id,
//                 f.created_at as favorited_at,
//                 u.id as unit_id,
//                 u.unit_type,
//                 u.name as unit_name,
//                 u.total_capacity,
//                 u.hourly_rate,
//                 u.daily_rate,
//                 u.monthly_rate,
//                 u.images,
//                 u.is_active as unit_active,
//                 u.duration,
//                 s.id as space_id,
//                 s.name as space_name,
//                 s.city,
//                 s.area,
//                 s.address,
//                 s.description as space_description
//             FROM favorites f
//             INNER JOIN space_units u ON u.id = f.unit_id
//             INNER JOIN spaces s ON s.id = u.space_id
//             WHERE f.user_id = $1
//             ORDER BY f.created_at DESC
//         `;

//         const result = await pool.query(query, [userId]);

//         const favorites = result.rows.map(row => ({
//             favorite_id: row.favorite_id,
//             favorited_at: row.favorited_at,
//             unit: {
//                 id: row.unit_id,
//                 unit_type: row.unit_type,
//                 name: row.unit_name,
//                 total_capacity: row.total_capacity,
//                 hourly_rate: row.hourly_rate ? parseFloat(row.hourly_rate) : null,
//                 daily_rate: row.daily_rate ? parseFloat(row.daily_rate) : null,
//                 monthly_rate: row.monthly_rate ? parseFloat(row.monthly_rate) : null,
//                 images: row.images || [],
//                 duration: row.duration,
//                 is_active: row.unit_active
//             },
//             space: {
//                 id: row.space_id,
//                 name: row.space_name,
//                 city: row.city,
//                 area: row.area,
//                 address: row.address,
//                 description: row.space_description
//             }
//         }));

//         return res.json({
//             success: true,
//             count: favorites.length,
//             favorites: favorites
//         });
//     } catch (error) {
//         console.error("Get favorites error:", error);
//         return res.status(500).json({
//             success: false,
//             message: "Server error: " + error.message
//         });
//     }
// };

// In your favriouts.controller.js

// GET USER'S FAVORITE UNITS with Nested Structure
// export const getUserFavorites = async (req, res) => {
//     try {
//         const userId = req.user.id;

//         const result = await pool.query(
//             `SELECT 
//                 f.id as favorite_id,
//                 f.created_at as favorited_at,
//                 u.id as unit_id,
//                 u.space_id,
//                 u.unit_type,
//                 u.name as unit_name,
//                 u.total_capacity,
//                 u.hourly_rate,
//                 u.daily_rate,
//                 u.monthly_rate,
//                 u.duration,
//                 u.is_active as unit_active,
//                 u.created_at as unit_created_at,
//                 u.updated_at as unit_updated_at,
//                 s.id as space_id,
//                 s.name as space_name,
//                 s.description as space_description,
//                 s.address,
//                 s.city,
//                 s.area,
//                 s.latitude,
//                 s.longitude,
//                 s.opening_time,
//                 s.closing_time,
//                 s.working_days,
//                 s.has_wifi,
//                 s.has_ac,
//                 s.has_coffee,
//                 s.has_printer,
//                 s.has_parking,
//                 s.has_security,
//                 s.has_backup_power,
//                 s.owner_id,
//                 s.is_verified,
//                 s.cancellation_policy,
//                 s.refund_policy,
//                 s.late_arrival_policy,
//                 -- Get images from unit_images table
//                 COALESCE(
//                     (SELECT json_agg(
//                         json_build_object(
//                             'id', ui.id,
//                             'image_base64', ui.image_base64,
//                             'display_order', ui.display_order,
//                             'is_primary', ui.is_primary
//                         ) ORDER BY ui.display_order
//                     ) FROM unit_images ui WHERE ui.unit_id = u.id),
//                     '[]'::json
//                 ) as images
//             FROM favorites f
//             JOIN space_units u ON f.unit_id = u.id
//             JOIN spaces s ON u.space_id = s.id
//             WHERE f.user_id = $1 AND u.is_active = true AND s.is_active = true
//             ORDER BY f.created_at DESC`,
//             [userId]
//         );

//         // Build nested response structure
//         const favorites = result.rows.map(row => ({
//             favorite_id: row.favorite_id,
//             favorited_at: row.favorited_at,
//             unit: {
//                 id: row.unit_id,
//                 space_id: row.space_id,
//                 unit_type: row.unit_type,
//                 name: row.unit_name,
//                 total_capacity: row.total_capacity ? parseInt(row.total_capacity) : null,
//                 hourly_rate: row.hourly_rate ? parseFloat(row.hourly_rate) : null,
//                 daily_rate: row.daily_rate ? parseFloat(row.daily_rate) : null,
//                 monthly_rate: row.monthly_rate ? parseFloat(row.monthly_rate) : null,
//                 duration: row.duration,
//                 is_active: row.unit_active,
//                 created_at: row.unit_created_at,
//                 updated_at: row.unit_updated_at,
//                 images: row.images || []
//             },
//             space: {
//                 id: row.space_id,
//                 name: row.space_name,
//                 description: row.space_description,
//                 address: row.address,
//                 city: row.city,
//                 area: row.area,
//                 latitude: row.latitude,
//                 longitude: row.longitude,
//                 opening_time: row.opening_time,
//                 closing_time: row.closing_time,
//                 working_days: row.working_days,
//                 has_wifi: row.has_wifi,
//                 has_ac: row.has_ac,
//                 has_coffee: row.has_coffee,
//                 has_printer: row.has_printer,
//                 has_parking: row.has_parking,
//                 has_security: row.has_security,
//                 has_backup_power: row.has_backup_power,
//                 owner_id: row.owner_id,
//                 is_verified: row.is_verified,
//                 cancellation_policy: row.cancellation_policy,
//                 refund_policy: row.refund_policy,
//                 late_arrival_policy: row.late_arrival_policy
//             }
//         }));

//         return res.status(200).json({
//             success: true,
//             count: favorites.length,
//             favorites: favorites
//         });

//     } catch (error) {
//         console.error("Get favorites error:", error);
//         return res.status(500).json({
//             success: false,
//             message: "Server error: " + error.message
//         });
//     }
// };




// Optimized getUserFavorites - Only returns needed fields
export const getUserFavorites = async (req, res) => {
    try {
        const userId = req.user.id;

        // First query: Get favorite and unit basic info (NO images)
        const favoritesResult = await pool.query(
            `SELECT 
                f.id as favorite_id,
                f.created_at as favorited_at,
                u.id as unit_id,
                u.unit_type,
                u.name as unit_name,
                u.total_capacity,
                u.hourly_rate,
                u.daily_rate,
                u.monthly_rate,
                u.is_active as unit_active,
                s.id as space_id,
                s.name as space_name,
                s.city,
                s.address,
                s.owner_id
            FROM favorites f
            JOIN space_units u ON f.unit_id = u.id
            JOIN spaces s ON u.space_id = s.id
            WHERE f.user_id = $1 AND u.is_active = true AND s.is_active = true
            ORDER BY f.created_at DESC`,
            [userId]
        );

        if (favoritesResult.rows.length === 0) {
            return res.status(200).json({
                success: true,
                count: 0,
                favorites: []
            });
        }

        // Collect all unit IDs to fetch images separately
        const unitIds = favoritesResult.rows.map(row => row.unit_id);

        // Fetch images for all units in a single query (optimized)
        const imagesResult = await pool.query(
            `SELECT DISTINCT ON (ui.unit_id, ui.display_order)
                ui.unit_id,
                ui.id as image_id,
                ui.image_base64,
                ui.display_order,
                ui.is_primary
            FROM unit_images ui
            WHERE ui.unit_id = ANY($1::uuid[])
            ORDER BY ui.unit_id, ui.display_order ASC, ui.is_primary DESC`,
            [unitIds]
        );

        // Group images by unit_id
        const imagesByUnit = {};
        imagesResult.rows.forEach(image => {
            if (!imagesByUnit[image.unit_id]) {
                imagesByUnit[image.unit_id] = [];
            }
            // Only store the first image per unit (for favorites list)
            if (imagesByUnit[image.unit_id].length === 0) {
                imagesByUnit[image.unit_id].push({
                    id: image.image_id,
                    image_base64: image.image_base64,
                    display_order: image.display_order,
                    is_primary: image.is_primary
                });
            }
        });

        // Build the response with minimal data
        const favorites = favoritesResult.rows.map(row => {
            // Parse numeric values
            const hourlyRate = row.hourly_rate && row.hourly_rate !== -999 ? parseFloat(row.hourly_rate) : null;
            const dailyRate = row.daily_rate && row.daily_rate !== -999 ? parseFloat(row.daily_rate) : null;
            const monthlyRate = row.monthly_rate && row.monthly_rate !== -999 ? parseFloat(row.monthly_rate) : null;

            return {
                favorite_id: row.favorite_id,
                favorited_at: row.favorited_at,
                unit: {
                    id: row.unit_id,
                    unit_type: row.unit_type,
                    name: row.unit_name,
                    total_capacity: row.total_capacity ? parseInt(row.total_capacity) : null,
                    hourly_rate: hourlyRate,
                    daily_rate: dailyRate,
                    monthly_rate: monthlyRate,
                    is_active: row.unit_active,
                    // Only first image for list view
                    images: imagesByUnit[row.unit_id] || []
                },
                space: {
                    id: row.space_id,
                    name: row.space_name,
                    city: row.city,
                    address: row.address,
                    owner_id: row.owner_id
                }
            };
        });

        return res.status(200).json({
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

// Optional: Separate endpoint to fetch full details when user clicks on a favorite
export const getFavoriteUnitDetails = async (req, res) => {
    try {
        const { unitId } = req.params;
        const userId = req.user.id;

        // Verify user owns this favorite
        const favoriteCheck = await pool.query(
            `SELECT id FROM favorites WHERE user_id = $1 AND unit_id = $2`,
            [userId, unitId]
        );

        if (favoriteCheck.rows.length === 0) {
            return res.status(403).json({
                success: false,
                message: "Not authorized to view this unit"
            });
        }

        // Get full unit details (when user clicks to view details)
        const unitResult = await pool.query(
            `SELECT 
                u.id, u.space_id, u.unit_type, u.name, u.total_capacity,
                u.hourly_rate, u.daily_rate, u.monthly_rate,
                u.duration, u.is_active, u.created_at, u.updated_at,
                s.name as space_name, s.description as space_description,
                s.address, s.city, s.area, s.latitude, s.longitude,
                s.opening_time, s.closing_time, s.working_days,
                s.has_wifi, s.has_ac, s.has_coffee, s.has_printer,
                s.has_parking, s.has_security, s.has_backup_power,
                s.owner_id,
                s.cancellation_policy, s.refund_policy, s.late_arrival_policy,
                s.is_verified
            FROM space_units u
            JOIN spaces s ON u.space_id = s.id
            WHERE u.id = $1 AND u.is_active = true AND s.is_active = true`,
            [unitId]
        );

        if (unitResult.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: "Unit not found"
            });
        }

        const row = unitResult.rows[0];
        const response = {
            success: true,
            unit: {
                id: row.id,
                space_id: row.space_id,
                unit_type: row.unit_type,
                name: row.name,
                total_capacity: row.total_capacity ? parseInt(row.total_capacity) : null,
                hourly_rate: row.hourly_rate && row.hourly_rate !== -999 ? parseFloat(row.hourly_rate) : null,
                daily_rate: row.daily_rate && row.daily_rate !== -999 ? parseFloat(row.daily_rate) : null,
                monthly_rate: row.monthly_rate && row.monthly_rate !== -999 ? parseFloat(row.monthly_rate) : null,
                duration: row.duration,
                is_active: row.is_active,
                created_at: row.created_at,
                updated_at: row.updated_at,
                space_name: row.space_name,
                space_description: row.space_description,
                address: row.address,
                city: row.city,
                area: row.area,
                latitude: row.latitude,
                longitude: row.longitude,
                opening_time: row.opening_time,
                closing_time: row.closing_time,
                working_days: row.working_days,
                has_wifi: row.has_wifi,
                has_ac: row.has_ac,
                has_coffee: row.has_coffee,
                has_printer: row.has_printer,
                has_parking: row.has_parking,
                has_security: row.has_security,
                has_backup_power: row.has_backup_power,
                owner_id: row.owner_id,
                space: {
                    id: row.space_id,
                    name: row.space_name,
                    description: row.space_description,
                    city: row.city,
                    area: row.area,
                    address: row.address,
                    latitude: row.latitude,
                    longitude: row.longitude,
                    opening_time: row.opening_time,
                    closing_time: row.closing_time,
                    working_days: row.working_days,
                    has_wifi: row.has_wifi,
                    has_ac: row.has_ac,
                    has_coffee: row.has_coffee,
                    has_printer: row.has_printer,
                    has_parking: row.has_parking,
                    has_security: row.has_security,
                    has_backup_power: row.has_backup_power,
                    is_verified: row.is_verified,
                    owner_id: row.owner_id,
                    cancellation_policy: row.cancellation_policy,
                    refund_policy: row.refund_policy,
                    late_arrival_policy: row.late_arrival_policy
                },
                space_amenities: {
                    wifi: row.has_wifi,
                    ac: row.has_ac,
                    coffee: row.has_coffee,
                    printer: row.has_printer,
                    parking: row.has_parking,
                    security: row.has_security,
                    backup_power: row.has_backup_power
                },
                policies: {
                    cancellation: row.cancellation_policy,
                    refund: row.refund_policy,
                    late_arrival: row.late_arrival_policy
                },
                display_name: (() => {
                    switch (row.unit_type) {
                        case 'open_desk': return 'Open Desk';
                        case 'dedicated_desk': return 'Dedicated Desk';
                        case 'private_cabin': return 'Private Cabin';
                        case 'meeting_room': return 'Meeting Room';
                        default: return row.unit_type;
                    }
                })()
            }
        };

        return res.status(200).json(response);

    } catch (error) {
        console.error("Get favorite unit details error:", error);
        return res.status(500).json({
            success: false,
            message: "Server error: " + error.message
        });
    }
};

// New endpoint: Get all images for a unit (lazy loading)
export const getUnitImagesOnly = async (req, res) => {
    try {
        const { unitId } = req.params;

        const result = await pool.query(
            `SELECT 
                id, 
                image_base64, 
                display_order, 
                is_primary
            FROM unit_images 
            WHERE unit_id = $1 
            ORDER BY display_order ASC, is_primary DESC`,
            [unitId]
        );

        const images = result.rows.map(row => ({
            id: row.id,
            image_base64: row.image_base64,
            display_order: row.display_order,
            is_primary: row.is_primary
        }));

        return res.status(200).json({
            success: true,
            images: images,
            count: images.length
        });

    } catch (error) {
        console.error("getUnitImagesOnly error:", error.message);
        return res.status(500).json({
            success: false,
            message: "Failed to load images",
            error: error.message
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