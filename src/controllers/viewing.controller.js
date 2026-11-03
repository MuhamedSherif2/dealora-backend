import { Viewing } from '../models/Viewing.js';
import { catchAsync } from '../utils/catchAsync.js';
import { AppError } from '../utils/AppError.js';
import { success } from '../utils/response.js';
import { parsePagination, paginationMeta } from '../utils/pagination.js';
import { EVENTS, VIEWING_TRANSITIONS } from '../config/constants.js';
import { upsertLead } from '../services/lead.service.js';
import { createViewing, assertNoConflict } from '../services/viewing.service.js';
import { emitEvent } from '../services/webhook.service.js';
import { viewingPayload } from '../services/webhook.payloads.js';

const POPULATE = [
  { path: 'property', select: 'title slug price currency purpose location.city location.district images' },
  { path: 'lead', select: 'name phone email language' },
  { path: 'agent', select: 'name phone email' },
];

// Guest or logged-in user books a viewing
export const requestViewing = catchAsync(async (req, res) => {
  const { propertyId, scheduledAt, notes, language } = req.body;
  const contact = req.user
    ? {
        name: req.user.name,
        phone: req.user.phone || req.body.phone,
        email: req.user.email,
        language: req.user.language,
      }
    : { name: req.body.name, phone: req.body.phone, email: req.body.email, language };

  if (!contact.name || !contact.phone) throw new AppError('Name and phone are required', 400);

  const { lead, property } = await upsertLead(
    { ...contact, message: notes, propertyId, source: 'website', user: req.user },
    { silent: true } // viewing.requested already carries the lead
  );
  const viewing = await createViewing({ property, lead, user: req.user, scheduledAt, notes });
  success(res, { viewing }, { status: 201 });
});

export const listViewings = catchAsync(async (req, res) => {
  const filter =
    req.user.role === 'admin' ? {} : req.user.role === 'agent' ? { agent: req.user._id } : { user: req.user._id };

  const { status, from, to, upcoming } = req.query;
  if (typeof status === 'string') filter.status = { $in: status.split(',') };

  const range = {};
  if (upcoming === 'true') range.$gte = new Date();
  if (typeof from === 'string' && !Number.isNaN(Date.parse(from))) range.$gte = new Date(from);
  if (typeof to === 'string' && !Number.isNaN(Date.parse(to))) range.$lte = new Date(to);
  if (Object.keys(range).length) filter.scheduledAt = range;

  const pg = parsePagination(req.query, { defaultLimit: 20, maxLimit: 100 });
  const [items, total] = await Promise.all([
    Viewing.find(filter)
      .sort({ scheduledAt: upcoming === 'true' ? 1 : -1 })
      .skip(pg.skip)
      .limit(pg.limit)
      .populate(POPULATE),
    Viewing.countDocuments(filter),
  ]);
  success(res, items, { meta: paginationMeta(pg, total) });
});

// Confirm / complete / cancel / reschedule
export const updateViewing = catchAsync(async (req, res) => {
  const viewing = await Viewing.findById(req.params.id).populate(POPULATE).populate('property');
  if (!viewing) throw new AppError('Viewing not found', 404);

  const { user } = req;
  const isOwnerClient = String(viewing.user) === String(user._id);
  const isItsAgent = String(viewing.agent?._id) === String(user._id);
  if (user.role === 'admin' ? false : user.role === 'agent' ? !isItsAgent : !isOwnerClient) {
    throw new AppError('Viewing not found', 404);
  }

  const { status, scheduledAt, notes } = req.body;

  // clients may only cancel their own viewing
  if (user.role === 'client' && (scheduledAt || notes !== undefined || (status && status !== 'cancelled'))) {
    throw new AppError('You can only cancel your viewing', 403);
  }

  const oldStatus = viewing.status;
  if (status && status !== oldStatus) {
    if (!VIEWING_TRANSITIONS[oldStatus].includes(status)) {
      throw new AppError(`Cannot change a ${oldStatus} viewing to ${status}`, 409);
    }
    viewing.status = status;
  }
  if (scheduledAt) {
    const when = new Date(scheduledAt);
    if (when <= new Date()) throw new AppError('Viewing time must be in the future', 400);
    await assertNoConflict(viewing.agent?._id, when, viewing._id);
    viewing.scheduledAt = when;
    viewing.reminderSent = false; // new time => new reminder
  }
  if (notes !== undefined) viewing.notes = notes;
  await viewing.save();

  if (viewing.status !== oldStatus) {
    emitEvent(EVENTS.VIEWING_STATUS_CHANGED, {
      ...viewingPayload(viewing, viewing.property, viewing.lead, viewing.agent),
      oldStatus,
      newStatus: viewing.status,
    });
  }
  success(res, viewing);
});
