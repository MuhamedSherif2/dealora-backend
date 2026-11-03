import { Lead } from '../models/Lead.js';
import { catchAsync } from '../utils/catchAsync.js';
import { AppError } from '../utils/AppError.js';
import { success } from '../utils/response.js';
import { parsePagination, paginationMeta } from '../utils/pagination.js';
import { PUBLIC_RESULTS_TTL_DAYS } from '../config/constants.js';
import { localizeProperty } from '../utils/localize.js';
import { upsertLead, applyLeadUpdate } from '../services/lead.service.js';

const escapeRegex = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const scopeFor = (user) => (user.role === 'admin' ? {} : { assignedAgent: user._id });

const PROPERTY_BRIEF = 'title slug price currency purpose location.city location.district images';

const POPULATE = [
  { path: 'property', select: PROPERTY_BRIEF },
  { path: 'assignedAgent', select: 'name phone email' },
];

// the lead's detail page also shows the properties the AI matched for him
const DETAIL_POPULATE = [...POPULATE, { path: 'matches.property', select: PROPERTY_BRIEF }];

const TOKEN_FORMAT = /^[A-Za-z0-9_-]{20,64}$/;
const PUBLIC_STATUSES = ['available', 'reserved']; // same visibility as the public listings
const PUBLIC_AGENT_FIELDS = 'name phone avatar company';

// public: "I'm interested" form
export const createLead = catchAsync(async (req, res) => {
  const { propertyId, ...data } = req.body;
  const { lead, duplicate } = await upsertLead({ ...data, propertyId, source: 'website', user: req.user });
  // The results token is given only to whoever created the lead. A duplicate submission (same phone +
  // same property within 24h) does NOT receive it, so nobody can read someone else's results by
  // typing that person's phone number.
  success(
    res,
    {
      lead: { id: lead._id, status: lead.status },
      duplicate,
      ...(!duplicate && { publicToken: lead.publicToken }),
    },
    { status: duplicate ? 200 : 201 }
  );
});

// public: the customer's results page. Open to anyone who has the secret token (no login).
// The frontend polls this until matchingStatus is 'ready'.
export const getPublicResults = catchAsync(async (req, res) => {
  const { token } = req.params;
  if (!TOKEN_FORMAT.test(token)) throw new AppError('Results not found', 404);

  const since = new Date(Date.now() - PUBLIC_RESULTS_TTL_DAYS * 24 * 60 * 60 * 1000);
  const lead = await Lead.findOne({ publicToken: token, createdAt: { $gte: since } })
    .select('matchingStatus matchedAt matches') // never name, phone, notes, score or status
    .populate({
      path: 'matches.property',
      match: { isActive: true, status: { $in: PUBLIC_STATUSES } },
      populate: { path: 'agent', select: PUBLIC_AGENT_FIELDS },
    })
    .lean();
  if (!lead) throw new AppError('Results not found', 404);

  const matches = (lead.matches || [])
    .filter((m) => m.property) // sold, disabled or deleted properties disappear from the page
    .map((m) => ({ score: m.score ?? null, reason: m.reason ?? null, property: localizeProperty(m.property, req.lang) }));

  res.set('Cache-Control', 'no-store');
  success(res, { matchingStatus: lead.matchingStatus, matchedAt: lead.matchedAt ?? null, matches });
});

export const getLeads = catchAsync(async (req, res) => {
  const filter = scopeFor(req.user);
  const { status, source, minScore, search, property, agent } = req.query;

  if (typeof status === 'string') filter.status = { $in: status.split(',') };
  if (typeof source === 'string') filter.source = source;
  if (typeof property === 'string') filter.property = property;
  if (typeof agent === 'string' && req.user.role === 'admin') filter.assignedAgent = agent;
  if (minScore !== undefined && Number.isFinite(Number(minScore))) filter.score = { $gte: Number(minScore) };
  if (typeof search === 'string' && search.trim()) {
    const re = new RegExp(escapeRegex(search.trim()), 'i');
    filter.$or = [{ name: re }, { phone: re }, { email: re }];
  }

  const pg = parsePagination(req.query, { defaultLimit: 20, maxLimit: 100 });
  const [items, total] = await Promise.all([
    Lead.find(filter).sort({ createdAt: -1 }).skip(pg.skip).limit(pg.limit).populate(POPULATE),
    Lead.countDocuments(filter),
  ]);
  success(res, items, { meta: paginationMeta(pg, total) });
});

async function findLead(req) {
  const lead = await Lead.findOne({ _id: req.params.id, ...scopeFor(req.user) });
  if (!lead) throw new AppError('Lead not found', 404);
  return lead;
}

export const getLead = catchAsync(async (req, res) => {
  const lead = await findLead(req);
  await lead.populate(DETAIL_POPULATE);
  success(res, lead);
});

export const updateLead = catchAsync(async (req, res) => {
  const lead = await findLead(req);
  const changes = { ...req.body };
  if (req.user.role !== 'admin') delete changes.assignedAgent; // only admins reassign
  await applyLeadUpdate(lead, changes, req.user.name);
  await lead.populate(POPULATE);
  success(res, lead);
});

export const addNote = catchAsync(async (req, res) => {
  const lead = await findLead(req);
  lead.notes.push({ text: req.body.text, authorName: req.user.name });
  await lead.save();
  success(res, lead.notes, { status: 201 });
});