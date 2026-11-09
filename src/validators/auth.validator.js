import { z } from 'zod';
import { LANGUAGES } from '../config/constants.js';
import { email, phone } from './common.js';

const password = z.string().min(8, 'Password must be at least 8 characters').max(100);

// WhatsApp keyboards in Arabic may type ٠١٢٣ — convert before checking
const ARABIC_DIGITS = '٠١٢٣٤٥٦٧٨٩';
const resetCode = z
  .string()
  .trim()
  .transform((s) => s.replace(/[٠-٩]/g, (d) => String(ARABIC_DIGITS.indexOf(d))))
  .refine((s) => /^\d{6}$/.test(s), 'Code must be 6 digits');

export const registerSchema = z.object({
  body: z.object({
    name: z.string().trim().min(2).max(100),
    email,
    phone: phone.optional(),
    password,
    language: z.enum(LANGUAGES).optional(),
  }),
});

export const loginSchema = z.object({
  body: z.object({ email, password: z.string().min(1) }),
});

export const updateMeSchema = z.object({
  body: z
    .object({
      name: z.string().trim().min(2).max(100),
      phone,
      language: z.enum(LANGUAGES),
    })
    .partial()
    .refine((v) => Object.keys(v).length > 0, 'Nothing to update'),
});

export const forgotPasswordSchema = z.object({ body: z.object({ email }) });

export const resetPasswordSchema = z.object({
  body: z.object({ email, code: resetCode, newPassword: password }),
});

export const changePasswordSchema = z.object({
  body: z.object({ currentPassword: z.string().min(1), newPassword: password }),
});