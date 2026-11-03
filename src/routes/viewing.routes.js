import { Router } from 'express';
import { requestViewing, listViewings, updateViewing } from '../controllers/viewing.controller.js';
import { protect, optionalAuth } from '../middlewares/auth.js';
import { validate } from '../middlewares/validate.js';
import { publicFormLimiter } from '../middlewares/rateLimiters.js';
import { requestViewingSchema, updateViewingSchema } from '../validators/viewing.validator.js';

const router = Router();

// guests and logged-in users can book
router.post('/', publicFormLimiter, optionalAuth, validate(requestViewingSchema), requestViewing);

router.get('/', protect, listViewings);
router.patch('/:id', protect, validate(updateViewingSchema), updateViewing);

export default router;
