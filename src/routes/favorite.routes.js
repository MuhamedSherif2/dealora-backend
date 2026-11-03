import { Router } from 'express';
import { listFavorites, addFavorite, removeFavorite } from '../controllers/favorite.controller.js';
import { protect } from '../middlewares/auth.js';

const router = Router();
router.use(protect);

router.get('/', listFavorites);
router.post('/:propertyId', addFavorite);
router.delete('/:propertyId', removeFavorite);

export default router;
