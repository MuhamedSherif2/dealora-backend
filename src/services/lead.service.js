import { Lead } from '../models/Lead.js';
import { Property } from '../models/Property.js';
import { AppError } from '../utils/AppError.js';
import { EVENTS } from '../config/constants.js';
import { emitEvent } from './webhook.service.js';
import { leadPayload } from './webhook.payloads.js';

const DUPLICATE_WINDOW_MS = 24 * 60 * 60 * 1000;

/**
 * Creates a lead, or — if the same phone asked about the same property in the
 * last 24h — appends the message to the existing one (stops double-submits and
 * spam from triggering the automation twice).
 * `silent: true` skips the lead.created event (used when a viewing request
 * follows, because viewing.requested already carries the lead).
 */
export async function upsertLead(
  { name, phone, email, message, propertyId, source = 'website', language, user },
  { silent = false } = {}
) {
  let property = null;
  if (propertyId) {
    property = await Property.findById(propertyId).populate('agent', 'name phone email');
    if (!property || !property.isActive) throw new AppError('Property not found', 404);
  }

  const existing = await Lead.findOne({
    phone,
    property: property?._id ?? null,
    createdAt: { $gte: new Date(Date.now() - DUPLICATE_WINDOW_MS) },
  });
  if (existing) {
    if (message) existing.notes.push({ text: message, authorName: name });
    await existing.save();
    return { lead: existing, property, duplicate: true };
  }

  const lead = await Lead.create({
    name,
    phone,
    email,
    message,
    language,
    source,
    property: property?._id,
    user: user?._id,
    assignedAgent: property?.agent?._id,
  });

  if (!silent) emitEvent(EVENTS.LEAD_CREATED, leadPayload(lead, property, property?.agent));
  return { lead, property, duplicate: false };
}

// Shared by the agent dashboard and by n8n (scoring / follow-up updates)
export async function applyLeadUpdate(lead, { status, assignedAgent, score, scoreReason, note }, authorName = 'system') {
  const oldStatus = lead.status;
  const statusChanged = status && status !== oldStatus;

  if (assignedAgent) lead.assignedAgent = assignedAgent;
  if (score !== undefined) lead.score = score;
  if (scoreReason !== undefined) lead.scoreReason = scoreReason;
  if (note) lead.notes.push({ text: note, authorName });
  if (statusChanged) {
    lead.status = status;
    if (status === 'contacted') lead.lastContactedAt = new Date();
  }
  await lead.save();

  if (statusChanged) {
    await lead.populate([{ path: 'property' }, { path: 'assignedAgent', select: 'name phone email' }]);
    emitEvent(EVENTS.LEAD_STATUS_CHANGED, {
      ...leadPayload(lead, lead.property, lead.assignedAgent),
      oldStatus,
      newStatus: status,
    });
  }
  return lead;
}
