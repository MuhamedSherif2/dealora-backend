import { z } from 'zod';
import { LANGUAGES, ROLES } from '../config/constants.js';
import { email, phone } from './common.js';

export const createUserSchema = z.object({
  body: z.object({
    name: z.string().trim().min(2).max(100),
    email,
    phone: phone.optional(),
    password: z.string().min(8).max(100),
    role: z.enum(ROLES).default('agent'),
    language: z.enum(LANGUAGES).optional(),
    company: z.string().trim().max(120).optional(),
    licenseNumber: z.string().trim().max(60).optional(),
  }),
});

export const updateUserSchema = z.object({
  body: z
    .object({
      name: z.string().trim().min(2).max(100),
      phone,
      role: z.enum(ROLES),
      isActive: z.boolean(),
      company: z.string().trim().max(120),
      licenseNumber: z.string().trim().max(60),
    })
    .partial()
    .refine((v) => Object.keys(v).length > 0, 'Nothing to update'),
});
