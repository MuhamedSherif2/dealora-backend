import { z } from 'zod';
import {
  COUNTRIES, CURRENCIES, PROPERTY_TYPES, PURPOSES, RENT_PERIODS, AREA_UNITS,
  FURNISHING, COMPLETION, PROPERTY_STATUS, PAYMENT_METHODS,
} from '../config/constants.js';
import { bilingual, objectId } from './common.js';

const coordinates = z.object({ lat: z.number().min(-90).max(90), lng: z.number().min(-180).max(180) });

const location = z.object({
  country: z.enum(COUNTRIES),
  city: bilingual(),
  district: bilingual().optional(),
  compound: bilingual().optional(),
  address: bilingual().optional(),
  coordinates: coordinates.optional(),
});

const propertyBody = z
  .object({
    title: bilingual(3),
    description: bilingual(10).optional(),
    type: z.enum(PROPERTY_TYPES),
    purpose: z.enum(PURPOSES),
    price: z.number().positive(),
    currency: z.enum(CURRENCIES).optional(),
    rentPeriod: z.enum(RENT_PERIODS).optional(),
    area: z.number().positive(),
    areaUnit: z.enum(AREA_UNITS).optional(),
    bedrooms: z.number().int().min(0).max(50).optional(),
    bathrooms: z.number().int().min(0).max(50).optional(),
    floor: z.number().int().optional(),
    furnishing: z.enum(FURNISHING).optional(),
    completionStatus: z.enum(COMPLETION).optional(),
    developer: z.string().trim().max(120).optional(),
    handoverDate: z.coerce.date().optional(),
    paymentPlan: z.string().trim().max(200).optional(),
    paymentMethod: z
      .array(z.enum(PAYMENT_METHODS))
      .max(PAYMENT_METHODS.length)
      .transform((a) => [...new Set(a)])
      .optional(),
    permitNumber: z.string().trim().max(60).optional(),
    location,
    amenities: z.array(z.string().trim().min(1).max(60)).max(40).optional(),
    status: z.enum(PROPERTY_STATUS).optional(),
    isFeatured: z.boolean().optional(),
    isActive: z.boolean().optional(),
    agent: objectId.optional(), // admin only (ignored for agents)
  })
  .strict();

export const createPropertySchema = z.object({ body: propertyBody });

// PATCH: every field optional; nested objects (title, location...) can be partial too
export const updatePropertySchema = z.object({
  body: propertyBody
    .partial()
    .extend({ location: location.partial().optional() })
    .refine((v) => Object.keys(v).length > 0, 'Nothing to update'),
});

export const updateStatusSchema = z.object({ body: z.object({ status: z.enum(PROPERTY_STATUS) }) });
export const removeImageSchema = z.object({ body: z.object({ publicId: z.string().min(1) }) });