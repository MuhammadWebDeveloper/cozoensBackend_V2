
import exptess from 'express';
const SearchRoute = exptess.Router();
import { searchSpaces } from '../controllers/searchController.js';


SearchRoute.get('/search', searchSpaces);

export default SearchRoute;