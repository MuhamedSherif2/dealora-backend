import { z } from 'zod';
import { LANGUAGES, VIEWING_STATUS } from '../config/constants.js';
import { email, objectId, phone } from './common.js';

// Logged-in users can omit name/phone/email; guests must send name + phone (checked in the controller)
export const requestViewingSchema = z.object({
  body: z.object({
    propertyId: objectId,
    scheduledAt: z.coerce.date(),
    name: z.string().trim().min(2).max(100).optional(),
    phone: phone.optional(),
    email: email.optional(),
    language: z.enum(LANGUAGES).optional(),
    notes: z.string().trim().max(1000).optional(),
  }),
});

export const automationViewingSchema = z.object({
  body: z.object({
    propertyId: objectId,
    scheduledAt: z.coerce.date(),
    name: z.string().trim().min(2).max(100),
    phone,
    email: email.optional(),
    language: z.enum(LANGUAGES).optional(),
    notes: z.string().trim().max(1000).optional(),
  }),
});

export const updateViewingSchema = z.object({
  body: z
    .object({
      status: z.enum(VIEWING_STATUS),
      scheduledAt: z.coerce.date(),
      notes: z.string().trim().max(1000),
    })
    .partial()
    .refine((v) => Object.keys(v).length > 0, 'Nothing to update'),
});
