import { z } from 'zod';
import { COMM_CHANNELS, LANGUAGES, LEAD_SOURCES, LEAD_STATUS } from '../config/constants.js';
import { email, objectId, phone } from './common.js';

const leadBase = {
  name: z.string().trim().min(2).max(100),
  phone,
  email: email.optional(),
  message: z.string().trim().max(2000).optional(),
  propertyId: objectId.optional(),
  language: z.enum(LANGUAGES).optional(),
};

// public website form
export const createLeadSchema = z.object({ body: z.object(leadBase) });

// from n8n (WhatsApp / chatbot / social inbound)
export const automationLeadSchema = z.object({
  body: z.object({ ...leadBase, source: z.enum(LEAD_SOURCES).default('chatbot') }),
});

export const updateLeadSchema = z.object({
  body: z
    .object({
      status: z.enum(LEAD_STATUS),
      assignedAgent: objectId,
      score: z.number().int().min(0).max(100),
      scoreReason: z.string().trim().max(500),
    })
    .partial()
    .refine((v) => Object.keys(v).length > 0, 'Nothing to update'),
});

// n8n: score / status / note in one call
export const automationUpdateLeadSchema = z.object({
  body: z
    .object({
      status: z.enum(LEAD_STATUS),
      score: z.number().int().min(0).max(100),
      scoreReason: z.string().trim().max(500),
      note: z.string().trim().min(1).max(2000),
    })
    .partial()
    .refine((v) => Object.keys(v).length > 0, 'Nothing to update'),
});

export const addNoteSchema = z.object({ body: z.object({ text: z.string().trim().min(1).max(2000) }) });

// n8n saves the properties it matched for a lead. The array REPLACES the previous matches
// (so re-running the workflow is safe) and its order is the ranking, best match first.
// An empty array is valid: "we looked and found nothing".
export const automationMatchesSchema = z.object({
  body: z.object({
    matches: z
      .array(
        z.object({
          propertyId: objectId,
          score: z.number().int().min(0).max(100).optional(),
          reason: z.string().trim().max(300).optional(),
        })
      )
      .max(10),
  }),
});

// n8n tells us it sent a message to the lead (we store only that it was sent)
export const automationCommunicationSchema = z.object({
  body: z.object({
    channel: z.enum(COMM_CHANNELS),
    label: z.string().trim().min(1).max(60).optional(),
    sentAt: z.coerce
      .date()
      .refine((d) => d.getTime() <= Date.now() + 5 * 60 * 1000, 'sentAt cannot be in the future')
      .optional(),
  }),
});
