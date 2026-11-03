import { z } from 'zod';
import { COUNTRIES, CURRENCIES, FURNISHING, NOTIFY_CHANNELS, PROPERTY_TYPES, PURPOSES } from '../config/constants.js';

const criteria = z
  .object({
    country: z.enum(COUNTRIES),
    city: z.string().trim().min(1).max(80),
    district: z.string().trim().min(1).max(80),
    purpose: z.enum(PURPOSES),
    types: z.array(z.enum(PROPERTY_TYPES)).max(11),
    currency: z.enum(CURRENCIES),
    minPrice: z.number().nonnegative(),
    maxPrice: z.number().positive(),
    minBedrooms: z.number().int().min(0),
    furnishing: z.enum(FURNISHING),
  })
  .partial()
  .refine((c) => Object.keys(c).length > 0, 'Add at least one search criterion');

export const createSavedSearchSchema = z.object({
  body: z.object({
    name: z.string().trim().max(80).optional(),
    criteria,
    notifyVia: z.array(z.enum(NOTIFY_CHANNELS)).min(1).optional(),
  }),
});

export const updateSavedSearchSchema = z.object({
  body: z
    .object({
      name: z.string().trim().max(80),
      criteria,
      notifyVia: z.array(z.enum(NOTIFY_CHANNELS)).min(1),
      isActive: z.boolean(),
    })
    .partial()
    .refine((v) => Object.keys(v).length > 0, 'Nothing to update'),
});
