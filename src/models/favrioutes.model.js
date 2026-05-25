// src/models/favorite.model.js
import { pool } from '../config/db.config.js';

// Add to favorites (like)
export const addFavorite = async (user_id, space_id) => {
    const query = `
        INSERT INTO favorites (user_id, space_id, created_at)
        VALUES ($1, $2, CURRENT_TIMESTAMP)
        ON CONFLICT (user_id, space_id) DO NOTHING
        RETURNING user_id, space_id, created_at
    `;
    const result = await pool.query(query, [user_id, space_id]);
    return result.rows[0];
};

// Remove from favorites (unlike)
export const removeFavorite = async (user_id, space_id) => {
    const query = `
        DELETE FROM favorites 
        WHERE user_id = $1 AND space_id = $2
        RETURNING user_id, space_id
    `;
    const result = await pool.query(query, [user_id, space_id]);
    return result.rows[0];
};

// Get all favorite spaces for a user
export const getUserFavorites = async (user_id) => {
    const query = `
        SELECT 
            f.space_id,
            f.created_at as favorited_at,
            s.name as space_name,
            s.city,
            s.address,
            s.verification_status,
        FROM favorites f
        JOIN spaces s ON f.space_id = s.id
        WHERE f.user_id = $1
        ORDER BY f.created_at DESC
    `;
    const result = await pool.query(query, [user_id]);
    return result.rows;
};

// Get like count for a specific space (for owner)
export const getSpaceLikeCount = async (space_id) => {
    const query = `
        SELECT COUNT(*) as like_count
        FROM favorites 
        WHERE space_id = $1
    `;
    const result = await pool.query(query, [space_id]);
    return parseInt(result.rows[0].like_count);
};

// Get like counts for multiple spaces (owner dashboard)
export const getMultipleSpacesLikeCount = async (space_ids) => {
    if (!space_ids.length) return [];

    const query = `
        SELECT 
            space_id,
            COUNT(*) as like_count
        FROM favorites 
        WHERE space_id = ANY($1::uuid[])
        GROUP BY space_id
    `;
    const result = await pool.query(query, [space_ids]);
    return result.rows;
};