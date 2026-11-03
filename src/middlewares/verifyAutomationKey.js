import crypto from 'node:crypto';
import { env } from '../config/env.js';
import { AppError } from '../utils/AppError.js';

const digest = (v) => crypto.createHash('sha256').update(String(v)).digest();

// Protects /api/automation/* — n8n sends:  x-api-key: <AUTOMATION_API_KEY>
export const verifyAutomationKey = (req, _res, next) => {
  if (!env.automationApiKey) return next(new AppError('Automation API is not configured', 503));
  const provided = req.headers['x-api-key'];
  if (!provided || !crypto.timingSafeEqual(digest(provided), digest(env.automationApiKey))) {
    return next(new AppError('Invalid API key', 401));
  }
  next();
};
