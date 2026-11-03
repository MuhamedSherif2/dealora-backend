// Builds the JSON that n8n receives. Keep these shapes stable: they are the
// contract between the backend and the automation workflows (see docs/WEBHOOKS.md).
import { propertyUrl, resultsUrl } from '../utils/links.js';

const toPlain = (d) => (d && typeof d.toObject === 'function' ? d.toObject() : d);
const idOf = (v) => (v && v._id ? String(v._id) : v ? String(v) : null);

export const agentSummary = (agent) => {
  const a = toPlain(agent);
  if (!a) return null;
  return a.name ? { id: idOf(a), name: a.name, phone: a.phone, email: a.email } : { id: idOf(a) };
};

export const propertySummary = (property) => {
  const p = toPlain(property);
  if (!p || !p.slug) return p ? { id: idOf(p) } : null; // not populated
  return {
    id: idOf(p),
    slug: p.slug,
    title: p.title,
    type: p.type,
    purpose: p.purpose,
    price: p.price,
    currency: p.currency,
    rentPeriod: p.rentPeriod,
    area: p.area,
    areaUnit: p.areaUnit,
    bedrooms: p.bedrooms,
    bathrooms: p.bathrooms,
    country: p.location?.country,
    city: p.location?.city,
    district: p.location?.district,
    compound: p.location?.compound,
    paymentMethod: p.paymentMethod,
    status: p.status,
    image: p.images?.[0]?.url ?? null,
    url: { ar: propertyUrl(p, 'ar'), en: propertyUrl(p, 'en') },
    agentId: idOf(p.agent),
  };
};

export const leadPayload = (lead, property, agent) => {
  const l = toPlain(lead);
  return {
    leadId: idOf(l),
    name: l.name,
    phone: l.phone,
    email: l.email,
    message: l.message,
    language: l.language,
    source: l.source,
    status: l.status,
    score: l.score ?? null,
    matchingStatus: l.matchingStatus,
    createdAt: l.createdAt,
    // only present on lead.created: the customer's private results page (n8n can send it on WhatsApp)
    ...(l.publicToken && {
      resultsUrl: { ar: resultsUrl(l.publicToken, 'ar'), en: resultsUrl(l.publicToken, 'en') },
    }),
    property: propertySummary(property),
    agent: agentSummary(agent),
  };
};

export const viewingPayload = (viewing, property, lead, agent) => {
  const v = toPlain(viewing);
  const l = toPlain(lead);
  return {
    viewingId: idOf(v),
    scheduledAt: v.scheduledAt,
    status: v.status,
    notes: v.notes,
    lead: l && { id: idOf(l), name: l.name, phone: l.phone, email: l.email, language: l.language },
    property: propertySummary(property),
    agent: agentSummary(agent),
  };
};

export const userPayload = (user) => {
  const u = toPlain(user);
  return { userId: idOf(u), name: u.name, email: u.email, phone: u.phone, language: u.language, role: u.role };
};
