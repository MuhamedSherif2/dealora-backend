import { User } from '../models/User.js';
import { AppError } from '../utils/AppError.js';
import { catchAsync } from '../utils/catchAsync.js';
import { verifyToken } from '../utils/jwt.js';

const extractToken = (req) => {
  const header = req.headers.authorization;
  return header?.startsWith('Bearer ') ? header.slice(7) : null;
};

// a token issued before the last password change is no longer valid
const issuedBeforePasswordChange = (user, decoded) =>
  user.passwordChangedAt && decoded.iat < Math.floor(user.passwordChangedAt.getTime() / 1000);

// Requires a valid JWT
export const protect = catchAsync(async (req, _res, next) => {
  const token = extractToken(req);
  if (!token) throw new AppError('Not authenticated', 401);

  let decoded;
  try {
    decoded = verifyToken(token);
  } catch {
    throw new AppError('Invalid or expired token', 401);
  }

  const user = await User.findById(decoded.id);
  if (!user || !user.isActive) throw new AppError('User no longer exists or is disabled', 401);
  if (issuedBeforePasswordChange(user, decoded)) {
    throw new AppError('Password was changed, please log in again', 401);
  }
  req.user = user;
  next();
});

// Attaches req.user if a valid token is present, otherwise continues as a guest
export const optionalAuth = catchAsync(async (req, _res, next) => {
  const token = extractToken(req);
  if (token) {
    try {
      const decoded = verifyToken(token);
      const user = await User.findById(decoded.id);
      if (user?.isActive && !issuedBeforePasswordChange(user, decoded)) req.user = user;
    } catch {
      /* treat as guest */
    }
  }
  next();
});

export const restrictTo =
  (...roles) =>
  (req, _res, next) =>
    roles.includes(req.user?.role) ? next() : next(new AppError('You do not have permission to do this', 403));
