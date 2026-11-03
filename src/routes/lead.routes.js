import { Router } from 'express';
import {
  createLead, getPublicResults, getLeads, getLead, updateLead, addNote,
} from '../controllers/lead.controller.js';
import { protect, optionalAuth, restrictTo } from '../middlewares/auth.js';
import { validate } from '../middlewares/validate.js';
import { publicFormLimiter, publicResultsLimiter } from '../middlewares/rateLimiters.js';
import { createLeadSchema, updateLeadSchema, addNoteSchema } from '../validators/lead.validator.js';

const router = Router();

// public form
router.post('/', publicFormLimiter, optionalAuth, validate(createLeadSchema), createLead);
// the customer's results page (secret token, no login). Must stay above the protect() line below.
router.get('/public/:token', publicResultsLimiter, getPublicResults);

// agent / admin
router.use(protect, restrictTo('agent', 'admin'));
router.get('/', getLeads);
router.get('/:id', getLead);
router.patch('/:id', validate(updateLeadSchema), updateLead);
router.post('/:id/notes', validate(addNoteSchema), addNote);

export default router;