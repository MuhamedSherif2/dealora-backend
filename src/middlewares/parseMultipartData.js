import { AppError } from '../utils/AppError.js';

/**
 * Lets one endpoint accept BOTH:
 *   - application/json                      -> body is used as is
 *   - multipart/form-data (fields + images) -> the property fields are sent as a JSON string in the
 *                                              "data" field, the files in "images"
 * Must run after multer and BEFORE validate(): the parsed object still goes through Zod,
 * and the schemas are strict, so unknown keys (e.g. $operators) are rejected.
 */
export const parseMultipartData = (req, _res, next) => {
  if (!req.is('multipart/form-data')) return next();

  const raw = req.body?.data;
  if (typeof raw !== 'string') {
    return next(new AppError('Send the property fields as JSON text in the "data" field', 400));
  }
  try {
    req.body = JSON.parse(raw);
  } catch {
    return next(new AppError('The "data" field is not valid JSON', 400));
  }
  next();
};