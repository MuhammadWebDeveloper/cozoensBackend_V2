
import SearchSpaces from '../controllers/search.Controller.js';
import express from 'express';
const SearchRoute = express.Router();
SearchRoute.get('/search', SearchSpaces);

export default SearchRoute;                         