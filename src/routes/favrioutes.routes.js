// routes/favoritesroutes.js
import express from 'express';
import protect from '../middleware/protect.middleware.js';
import {
    toggleFavorite,
    checkFavorite,
    getUserFavorites,
    getUnitFavoriteCount,
    getFavoriteUnitDetails,
    getUnitImagesOnly
} from '../controllers/favriouts.controller.js';

const favoritesroutes = express.Router();

// ============= PUBLIC ROUTES (no authentication needed) =============
// Get favorite count for a unit (anyone can see how many people favorited)
favoritesroutes.get('/count/:unitId', getUnitFavoriteCount);


// ============= PROTECTED ROUTES (require authentication) =============
favoritesroutes.use(protect);

// Toggle favorite (add/remove)
favoritesroutes.post('/toggle/:unitId', toggleFavorite);

// Check if current user has favorited a specific unit
favoritesroutes.get('/check/:unitId', checkFavorite);

// Get user's favorite units (OPTIMIZED - only essential data)
favoritesroutes.get('/my-favorites', getUserFavorites);

// Get full details of a favorited unit (when user clicks to view)
favoritesroutes.get('/unit/:unitId', getFavoriteUnitDetails);

// Get images for a favorited unit (lazy loading)
favoritesroutes.get('/unit/:unitId/images', getUnitImagesOnly);


export default favoritesroutes;