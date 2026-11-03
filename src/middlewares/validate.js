import { AppError } from '../utils/AppError.js';

// validate(z.object({ body: ..., query: ..., params: ... }))
export const validate = (schema) => (req, _res, next) => {
  const result = schema.safeParse({ body: req.body, query: req.query, params: req.params });
  if (!result.success) {
    const details = result.error.issues.map((i) => ({ path: i.path.slice(1).join('.'), message: i.message }));
    return next(new AppError('Validation failed', 400, details));
  }
  if (result.data.body) req.body = result.data.body; // cleaned + coerced body
  next();
};
