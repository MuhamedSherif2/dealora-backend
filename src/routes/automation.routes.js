import { Router } from 'express';
import {
  searchProperties, getProperty, createLead, listStaleLeads, updateLead, saveMatches, logCommunication, bookViewing,
  listUpcomingViewings, markReminderSent, listSavedSearches, matchingSearches, markSearchNotified,
} from '../controllers/automation.controller.js';
import { verifyAutomationKey } from '../middlewares/verifyAutomationKey.js';
import { validate } from '../middlewares/validate.js';
import {
  automationLeadSchema, automationUpdateLeadSchema, automationMatchesSchema, automationCommunicationSchema,
} from '../validators/lead.validator.js';
import { automationViewingSchema } from '../validators/viewing.validator.js';

const router = Router();
router.use(verifyAutomationKey); // every route here requires the x-api-key header

// properties
router.get('/properties', searchProperties);
router.get('/properties/:id', getProperty);
router.get('/properties/:id/matching-searches', matchingSearches);

// leads
router.post('/leads', validate(automationLeadSchema), createLead);
router.get('/leads/stale', listStaleLeads);
router.patch('/leads/:id', validate(automationUpdateLeadSchema), updateLead);
router.put('/leads/:id/matches', validate(automationMatchesSchema), saveMatches);
router.post('/leads/:id/communications', validate(automationCommunicationSchema), logCommunication);

// viewings
router.post('/viewings', validate(automationViewingSchema), bookViewing);
router.get('/viewings/upcoming', listUpcomingViewings);
router.patch('/viewings/:id/reminder-sent', markReminderSent);

// saved searches
router.get('/saved-searches', listSavedSearches);
router.patch('/saved-searches/:id/notified', markSearchNotified);

export default router;