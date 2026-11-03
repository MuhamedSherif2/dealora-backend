import { Viewing } from '../models/Viewing.js';
import { AppError } from '../utils/AppError.js';
import { EVENTS } from '../config/constants.js';
import { emitEvent } from './webhook.service.js';
import { viewingPayload } from './webhook.payloads.js';

const SLOT_MINUTES = 60;

// An agent can't be in two viewings within the same hour
export async function assertNoConflict(agentId, when, excludeId) {
  if (!agentId) return;
  const from = new Date(when.getTime() - (SLOT_MINUTES - 1) * 60000);
  const to = new Date(when.getTime() + SLOT_MINUTES * 60000);
  const clash = await Viewing.exists({
    agent: agentId,
    status: { $in: ['pending', 'confirmed'] },
    scheduledAt: { $gte: from, $lt: to },
    ...(excludeId && { _id: { $ne: excludeId } }),
  });
  if (clash) throw new AppError('This time slot is not available, please choose another time', 409);
}

// `property` must be populated with `agent`
export async function createViewing({ property, lead, user, scheduledAt, notes }) {
  if (property.status !== 'available') throw new AppError('This property is not available for viewing', 409);

  const when = new Date(scheduledAt);
  if (when <= new Date()) throw new AppError('Viewing time must be in the future', 400);

  const agentId = property.agent?._id ?? property.agent;
  await assertNoConflict(agentId, when);

  const viewing = await Viewing.create({
    property: property._id,
    lead: lead._id,
    user: user?._id,
    agent: agentId,
    scheduledAt: when,
    notes,
  });

  if (['new', 'contacted'].includes(lead.status)) {
    lead.status = 'viewing_scheduled';
    await lead.save();
  }

  emitEvent(EVENTS.VIEWING_REQUESTED, viewingPayload(viewing, property, lead, property.agent));
  return viewing;
}
