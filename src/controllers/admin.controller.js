import { User } from '../models/User.js';
import { WebhookLog } from '../models/WebhookLog.js';
import { catchAsync } from '../utils/catchAsync.js';
import { AppError } from '../utils/AppError.js';
import { success } from '../utils/response.js';
import { parsePagination, paginationMeta } from '../utils/pagination.js';
import { retryFailedWebhooks } from '../services/webhook.service.js';

const escapeRegex = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// ---------- users ----------
export const listUsers = catchAsync(async (req, res) => {
  const filter = {};
  if (typeof req.query.role === 'string') filter.role = req.query.role;
  if (typeof req.query.search === 'string' && req.query.search.trim()) {
    const re = new RegExp(escapeRegex(req.query.search.trim()), 'i');
    filter.$or = [{ name: re }, { email: re }, { phone: re }];
  }
  const pg = parsePagination(req.query, { defaultLimit: 20, maxLimit: 100 });
  const [items, total] = await Promise.all([
    User.find(filter).sort({ createdAt: -1 }).skip(pg.skip).limit(pg.limit),
    User.countDocuments(filter),
  ]);
  success(res, items, { meta: paginationMeta(pg, total) });
});

export const createUser = catchAsync(async (req, res) => {
  success(res, await User.create(req.body), { status: 201 });
});

export const updateUser = catchAsync(async (req, res) => {
  if (String(req.params.id) === String(req.user._id) && (req.body.role || req.body.isActive === false)) {
    throw new AppError('You cannot change your own role or disable yourself', 400);
  }
  const user = await User.findById(req.params.id);
  if (!user) throw new AppError('User not found', 404);
  user.set(req.body);
  await user.save({ validateModifiedOnly: true });
  success(res, user);
});

// ---------- webhook logs ----------
export const listWebhookLogs = catchAsync(async (req, res) => {
  const filter = {};
  if (typeof req.query.status === 'string') filter.status = req.query.status;
  if (typeof req.query.event === 'string') filter.event = req.query.event;
  const pg = parsePagination(req.query, { defaultLimit: 30, maxLimit: 100 });
  const [items, total] = await Promise.all([
    WebhookLog.find(filter).sort({ createdAt: -1 }).skip(pg.skip).limit(pg.limit),
    WebhookLog.countDocuments(filter),
  ]);
  success(res, items, { meta: paginationMeta(pg, total) });
});

export const retryWebhooks = catchAsync(async (_req, res) => {
  success(res, await retryFailedWebhooks());
});
