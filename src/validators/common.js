import { z } from 'zod';
import { normalizePhone, PHONE_REGEX } from '../utils/phone.js';

export const objectId = z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid id');

export const phone = z
  .string()
  .transform(normalizePhone)
  .refine((v) => PHONE_REGEX.test(v), 'Phone must be in international format, e.g. +971501234567');

export const email = z.string().trim().toLowerCase().email();

// { ar?: string, en?: string } — at least one language is required
export const bilingual = (min = 1) =>
  z
    .object({ ar: z.string().trim().min(min).optional(), en: z.string().trim().min(min).optional() })
    .refine((v) => v.ar || v.en, { message: 'Provide at least one language (ar or en)' });
