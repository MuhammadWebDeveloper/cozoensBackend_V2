
import exptess from 'express';
import { searchSpaces } from '../controllers/search.Controller';
const SearchRoute = express.Router();
SearchRoute.get('/search', searchSpaces);

export default SearchRoute;                         