import { Router } from 'express';
import {
  listSavedSearches, createSavedSearch, updateSavedSearch, deleteSavedSearch,
} from '../controllers/savedSearch.controller.js';
import { protect } from '../middlewares/auth.js';
import { validate } from '../middlewares/validate.js';
import { createSavedSearchSchema, updateSavedSearchSchema } from '../validators/savedSearch.validator.js';

const router = Router();
router.use(protect);

router.get('/', listSavedSearches);
router.post('/', validate(createSavedSearchSchema), createSavedSearch);
router.patch('/:id', validate(updateSavedSearchSchema), updateSavedSearch);
router.delete('/:id', deleteSavedSearch);

export default router;
