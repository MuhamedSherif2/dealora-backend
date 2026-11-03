export const success = (res, data, { status = 200, meta, message } = {}) =>
  res.status(status).json({
    status: 'success',
    ...(message && { message }),
    ...(meta && { meta }),
    data,
  });
