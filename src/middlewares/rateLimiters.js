import rateLimit from 'express-rate-limit';

const make = (windowMs, limit, message, extra = {}) =>
  rateLimit({
    windowMs,
    limit,
    standardHeaders: true,
    legacyHeaders: false,
    message: { status: 'fail', message },
    ...extra,
  });

// n8n is trusted (it has the API key) so it is not throttled by the general limiter
export const apiLimiter = make(15 * 60 * 1000, 600, 'Too many requests, please try again later', {
  skip: (req) => req.path.startsWith('/automation'),
});
export const authLimiter = make(15 * 60 * 1000, 20, 'Too many attempts, please try again later');
// public forms (leads / viewing requests): protects against spam
export const publicFormLimiter = make(60 * 60 * 1000, 15, 'Too many submissions, please try again later');
// forgot / reset password: each one can trigger a WhatsApp/email message
export const passwordResetLimiter = make(60 * 60 * 1000, 10, 'Too many attempts, please try again later');
// the customer's results page polls every few seconds while the AI is matching, so it needs more room
export const publicResultsLimiter = make(15 * 60 * 1000, 120, 'Too many requests, please try again later');
