// Endpoints used by n8n (protected by x-api-key). Responses are compact and
// already localized so workflows / chatbots can use them directly.
import { Property } from '../models/Property.js';
import { Lead } from '../models/Lead.js';
import { Viewing } from '../models/Viewing.js';
import { SavedSearch } from '../models/SavedSearch.js';
import { catchAsync } from '../utils/catchAsync.js';
import { AppError } from '../utils/AppError.js';
import { success } from '../utils/response.js';
import { parsePagination, paginationMeta } from '../utils/pagination.js';
import { buildPropertyFilter, buildSort, matchesCriteria } from '../utils/propertyFilters.js';
import { localizeProperty } from '../utils/localize.js';
import { propertyUrl, resultsUrl } from '../utils/links.js';
import { upsertLead, applyLeadUpdate } from '../services/lead.service.js';
import { createViewing } from '../services/viewing.service.js';

const LANGS = ['ar', 'en'];
const langOf = (req) => (LANGS.includes(req.query.lang) ? req.query.lang : req.lang);

function compact(property, lang) {
  const p = localizeProperty(property, lang);
  return {
    id: String(p._id),
    slug: p.slug,
    title: p.i18n.title,
    description: p.i18n.description,
    type: p.type,
    purpose: p.purpose,
    price: p.price,
    currency: p.currency,
    rentPeriod: p.rentPeriod,
    area: p.area,
    areaUnit: p.areaUnit,
    bedrooms: p.bedrooms,
    bathrooms: p.bathrooms,
    furnishing: p.furnishing,
    completionStatus: p.completionStatus,
    country: p.location?.country,
    city: p.i18n.city,
    district: p.i18n.district,
    compound: p.i18n.compound,
    paymentMethod: p.paymentMethod,
    status: p.status,
    image: p.images?.[0]?.url ?? null,
    url: propertyUrl(p, lang),
  };
}

// ---------- properties (chatbot search) ----------
export const searchProperties = catchAsync(async (req, res) => {
  const lang = langOf(req);
  const filter = buildPropertyFilter(req.query);
  const pg = parsePagination(req.query, { defaultLimit: 5, maxLimit: 20 });
  const [items, total] = await Promise.all([
    Property.find(filter).sort(buildSort(req.query.sort)).skip(pg.skip).limit(pg.limit).lean(),
    Property.countDocuments(filter),
  ]);
  success(res, items.map((p) => compact(p, lang)), { meta: paginationMeta(pg, total) });
});

export const getProperty = catchAsync(async (req, res) => {
  const property = await Property.findOne({ _id: req.params.id, isActive: true }).populate('agent', 'name phone').lean();
  if (!property) throw new AppError('Property not found', 404);
  success(res, { ...compact(property, langOf(req)), agent: property.agent });
});

// ---------- leads ----------
// Inbound lead created by n8n (WhatsApp message, social ad form, chatbot ...)
export const createLead = catchAsync(async (req, res) => {
  const { lead, duplicate } = await upsertLead(req.body);
  // the customer's private results page, only for a brand-new lead (see getPublicResults)
  const links = !duplicate && lead.publicToken
    ? { resultsUrl: { ar: resultsUrl(lead.publicToken, 'ar'), en: resultsUrl(lead.publicToken, 'en') } }
    : {};
  success(res, { lead, duplicate, ...links }, { status: duplicate ? 200 : 201 });
});

// Leads that nobody followed up: ?status=new,contacted&olderThanHours=72
export const listStaleLeads = catchAsync(async (req, res) => {
  const hours = Number(req.query.olderThanHours) || 72;
  const statuses = typeof req.query.status === 'string' ? req.query.status.split(',') : ['new', 'contacted'];
  const filter = { status: { $in: statuses }, updatedAt: { $lt: new Date(Date.now() - hours * 3600 * 1000) } };

  const pg = parsePagination(req.query, { defaultLimit: 50, maxLimit: 200 });
  const [items, total] = await Promise.all([
    Lead.find(filter)
      .sort({ updatedAt: 1 })
      .skip(pg.skip)
      .limit(pg.limit)
      .populate('property', 'title slug')
      .populate('assignedAgent', 'name phone email'),
    Lead.countDocuments(filter),
  ]);
  success(res, items, { meta: paginationMeta(pg, total) });
});

// n8n writes back the AI score, status or a note
export const updateLead = catchAsync(async (req, res) => {
  const lead = await Lead.findById(req.params.id);
  if (!lead) throw new AppError('Lead not found', 404);
  await applyLeadUpdate(lead, req.body, 'n8n');
  success(res, lead);
});

// n8n saves the properties its AI matched for the lead. The list REPLACES the old one and its order
// is the ranking. matchingStatus becomes 'ready' even for an empty list, so the customer's page
// can stop waiting and say "nothing matched yet".
export const saveMatches = catchAsync(async (req, res) => {
  const lead = await Lead.findById(req.params.id);
  if (!lead) throw new AppError('Lead not found', 404);

  // the same property twice -> keep the first (best-ranked) one
  const seen = new Set();
  const unique = [];
  for (const m of req.body.matches) {
    const propertyId = m.propertyId.toLowerCase(); // ObjectIds are hex: "AB12.." and "ab12.." are the same id
    if (seen.has(propertyId)) continue;
    seen.add(propertyId);
    unique.push({ ...m, propertyId });
  }

  const found = await Property.find({ _id: { $in: unique.map((m) => m.propertyId) }, isActive: true }).select('_id').lean();
  const existing = new Set(found.map((p) => String(p._id)));
  const missing = unique.filter((m) => !existing.has(m.propertyId));
  if (missing.length) {
    throw new AppError(
      'Some properties were not found or are not active',
      400,
      missing.map((m) => ({ path: 'matches.propertyId', message: `Property ${m.propertyId} not found` }))
    );
  }

  lead.matches = unique.map((m) => ({ property: m.propertyId, score: m.score, reason: m.reason }));
  lead.matchingStatus = 'ready';
  lead.matchedAt = new Date();
  await lead.save();
  success(res, { leadId: lead._id, matchingStatus: lead.matchingStatus, matchedAt: lead.matchedAt, count: lead.matches.length });
});

// n8n tells us it sent a message to the lead. We keep only the proof (channel + time + optional label).
const MAX_COMMUNICATIONS = 200; // oldest entries are dropped so one lead's document can't grow forever

export const logCommunication = catchAsync(async (req, res) => {
  const { channel, label, sentAt } = req.body;
  const entry = { channel, ...(label && { label }), sentAt: sentAt ?? new Date() };

  const lead = await Lead.findByIdAndUpdate(
    req.params.id,
    {
      $push: { communications: { $each: [entry], $slice: -MAX_COMMUNICATIONS } },
      $max: { lastContactedAt: entry.sentAt }, // never moves backwards if n8n logs an older message
    },
    { new: true, runValidators: true }
  ).select('communications lastContactedAt');
  if (!lead) throw new AppError('Lead not found', 404);
  success(res, { communications: lead.communications, lastContactedAt: lead.lastContactedAt }, { status: 201 });
});

// ---------- viewings ----------
// Chatbot books a viewing for a WhatsApp customer
export const bookViewing = catchAsync(async (req, res) => {
  const { propertyId, scheduledAt, notes, ...contact } = req.body;
  const { lead, property } = await upsertLead(
    { ...contact, message: notes, propertyId, source: 'chatbot' },
    { silent: true }
  );
  const viewing = await createViewing({ property, lead, scheduledAt, notes });
  success(res, { viewing }, { status: 201 });
});

// Reminders: ?withinHours=24&reminderSent=false&status=confirmed
export const listUpcomingViewings = catchAsync(async (req, res) => {
  const within = Number(req.query.withinHours) || 24;
  const statuses = typeof req.query.status === 'string' ? req.query.status.split(',') : ['confirmed'];
  const now = new Date();
  const filter = {
    status: { $in: statuses },
    scheduledAt: { $gte: now, $lte: new Date(now.getTime() + within * 3600 * 1000) },
  };
  if (req.query.reminderSent === 'false') filter.reminderSent = false;
  if (req.query.reminderSent === 'true') filter.reminderSent = true;

  const items = await Viewing.find(filter)
    .sort({ scheduledAt: 1 })
    .limit(200)
    .populate('property', 'title slug location.city location.district')
    .populate('lead', 'name phone language')
    .populate('agent', 'name phone');
  success(res, items);
});

export const markReminderSent = catchAsync(async (req, res) => {
  const viewing = await Viewing.findByIdAndUpdate(req.params.id, { reminderSent: true }, { new: true });
  if (!viewing) throw new AppError('Viewing not found', 404);
  success(res, viewing);
});

// ---------- saved searches (new-listing alerts) ----------
export const listSavedSearches = catchAsync(async (_req, res) => {
  success(
    res,
    await SavedSearch.find({ isActive: true }).limit(1000).populate('user', 'name email phone language')
  );
});

// n8n calls this when it receives property.created: who should be notified?
export const matchingSearches = catchAsync(async (req, res) => {
  const property = await Property.findById(req.params.id).lean();
  if (!property) throw new AppError('Property not found', 404);

  const searches = await SavedSearch.find({
    isActive: true,
    $or: [{ 'criteria.country': { $exists: false } }, { 'criteria.country': property.location?.country }],
  }).populate('user', 'name email phone language');

  const matches = searches.filter((s) => s.user && matchesCriteria(property, s.criteria));
  success(res, { property: { ar: compact(property, 'ar'), en: compact(property, 'en') }, matches });
});

export const markSearchNotified = catchAsync(async (req, res) => {
  const search = await SavedSearch.findByIdAndUpdate(req.params.id, { lastNotifiedAt: new Date() }, { new: true });
  if (!search) throw new AppError('Saved search not found', 404);
  success(res, search);
});
