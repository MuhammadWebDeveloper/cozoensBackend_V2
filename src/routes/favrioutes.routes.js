// routes/favoritesroutes.js
import express from 'express';
import protect from '../middleware/protect.middleware.js';
import {
    toggleFavorite,
    checkFavorite,
    getUserFavorites,
    getUnitFavoriteCount
} from '../controllers/favriouts.controllers.js';

const favoritesroutes = express.Router();
// Public routes (no authentication needed)
favoritesroutes.get('/count/:unitId', getUnitFavoriteCount);

// Protected routes (require authentication)
favoritesroutes.use(protect);

// Toggle favorite (add/remove)
favoritesroutes.post('/toggle/:unitId', toggleFavorite);

// Check if unit is favorited
favoritesroutes.get('/check/:unitId', checkFavorite);

// Get user's favorite units
favoritesroutes.get('/my-favorites', getUserFavorites);

export default favoritesroutes;