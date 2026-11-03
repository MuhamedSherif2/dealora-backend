import { AppError } from '../utils/AppError.js';
import { env } from '../config/env.js';

export const errorHandler = (err, _req, res, _next) => {
  let error = err;

  if (err.type === 'entity.parse.failed') error = new AppError('Invalid JSON body', 400);
  else if (err.name === 'CastError') error = new AppError(`Invalid value for ${err.path}`, 400);
  else if (err.code === 11000) {
    const field = Object.keys(err.keyValue || {})[0] || 'field';
    error = new AppError(`${field} already exists`, 409);
  } else if (err.name === 'ValidationError' && err.errors) {
    error = new AppError(
      'Validation failed',
      400,
      Object.values(err.errors).map((e) => ({ path: e.path, message: e.message }))
    );
  } else if (err.name === 'MulterError') error = new AppError(err.message, 400);

  if (!error.isOperational) console.error(err);

  const statusCode = error.statusCode || 500;
  res.status(statusCode).json({
    status: String(statusCode).startsWith('4') ? 'fail' : 'error',
    message: error.isOperational ? error.message : 'Internal server error',
    ...(error.details && { errors: error.details }),
    ...(!env.isProd && !error.isOperational && { stack: err.stack }),
  });
};
