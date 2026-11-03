// Builds MongoDB filters/sorts from query strings. Used by the public API,
// the agent dashboard and the automation (n8n) API so they all behave the same.

const escapeRegex = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const str = (v) => (typeof v === 'string' && v.trim() ? v.trim() : undefined);
const num = (v) => {
  if (v === undefined || v === null || v === '') return undefined;
  const n = Number(v);
  return Number.isFinite(n) ? n : undefined;
};
const list = (v) => str(v)?.split(',').map((s) => s.trim()).filter(Boolean) ?? [];
const exactCI = (s) => new RegExp(`^${escapeRegex(s)}$`, 'i');

const PUBLIC_STATUSES = ['available', 'reserved'];

export function buildPropertyFilter(q = {}, { publicOnly = true } = {}) {
  const f = {};
  const and = [];

  if (publicOnly) f.isActive = true;

  // status
  const requested = list(q.status);
  if (publicOnly) {
    const allowed = requested.filter((s) => PUBLIC_STATUSES.includes(s));
    f.status = { $in: allowed.length ? allowed : ['available'] };
  } else if (requested.length && !requested.includes('all')) {
    f.status = { $in: requested };
  }

  const country = str(q.country);
  if (country) f['location.country'] = country.toUpperCase();

  const city = str(q.city);
  if (city) and.push({ $or: [{ 'location.city.en': exactCI(city) }, { 'location.city.ar': exactCI(city) }] });

  const district = str(q.district);
  if (district) {
    and.push({ $or: [{ 'location.district.en': exactCI(district) }, { 'location.district.ar': exactCI(district) }] });
  }

  // compound: partial, case-insensitive match (names are free text, chatbot input is fuzzy)
  const compound = str(q.compound);
  if (compound) {
    const re = new RegExp(escapeRegex(compound.slice(0, 100)), 'i');
    and.push({ $or: [{ 'location.compound.en': re }, { 'location.compound.ar': re }] });
  }

  const types = list(q.type);
  if (types.length) f.type = { $in: types };

  const purpose = str(q.purpose);
  if (purpose) f.purpose = purpose;

  const currency = str(q.currency);
  if (currency) f.currency = currency.toUpperCase();

  const minPrice = num(q.minPrice);
  const maxPrice = num(q.maxPrice);
  if (minPrice !== undefined || maxPrice !== undefined) {
    f.price = {};
    if (minPrice !== undefined) f.price.$gte = minPrice;
    if (maxPrice !== undefined) f.price.$lte = maxPrice;
  }

  // bedrooms: "3" | "1,2,3" | "4+"
  const bedrooms = str(q.bedrooms);
  if (bedrooms) {
    if (bedrooms.endsWith('+')) {
      const n = num(bedrooms.slice(0, -1));
      if (n !== undefined) f.bedrooms = { $gte: n };
    } else {
      const nums = list(bedrooms).map(Number).filter(Number.isFinite);
      if (nums.length) f.bedrooms = { $in: nums };
    }
  }
  const minBathrooms = num(q.minBathrooms);
  if (minBathrooms !== undefined) f.bathrooms = { $gte: minBathrooms };

  const minArea = num(q.minArea);
  const maxArea = num(q.maxArea);
  if (minArea !== undefined || maxArea !== undefined) {
    f.area = {};
    if (minArea !== undefined) f.area.$gte = minArea;
    if (maxArea !== undefined) f.area.$lte = maxArea;
  }

  const furnishing = list(q.furnishing);
  if (furnishing.length) f.furnishing = { $in: furnishing };

  // paymentMethod=cash,mortgage -> listings that accept ANY of them
  const paymentMethods = list(q.paymentMethod);
  if (paymentMethods.length) f.paymentMethod = { $in: paymentMethods };

  const completion = list(q.completionStatus);
  if (completion.length) f.completionStatus = { $in: completion };

  const amenities = list(q.amenities);
  if (amenities.length) f.amenities = { $all: amenities };

  if (q.isFeatured === 'true') f.isFeatured = true;

  if (!publicOnly) {
    const agent = str(q.agent);
    if (agent) f.agent = agent;
  }

  // full-text search (Arabic + English fields, see text index in Property model)
  const search = str(q.search);
  if (search) f.$text = { $search: search };

  // "near me": ?lat=25.2&lng=55.27&radius=5   (radius in km)
  const lat = num(q.lat);
  const lng = num(q.lng);
  if (lat !== undefined && lng !== undefined) {
    const radiusKm = num(q.radius) ?? 5;
    f['location.geo'] = { $geoWithin: { $centerSphere: [[lng, lat], radiusKm / 6378.1] } };
  }

  if (and.length) f.$and = and;
  return f;
}

const SORTS = {
  newest: { createdAt: -1 },
  oldest: { createdAt: 1 },
  price_asc: { price: 1 },
  price_desc: { price: -1 },
  area_desc: { area: -1 },
  popular: { views: -1 },
};
export const buildSort = (key) => SORTS[key] ?? { isFeatured: -1, createdAt: -1 };

// Does a property satisfy a SavedSearch.criteria object? (used for "new listing" alerts)
export function matchesCriteria(property, c = {}) {
  const p = typeof property.toObject === 'function' ? property.toObject() : property;
  const eq = (a, b) => String(a ?? '').toLowerCase() === String(b ?? '').toLowerCase();

  if (c.country && p.location?.country !== c.country) return false;
  if (c.city && !(eq(p.location?.city?.en, c.city) || eq(p.location?.city?.ar, c.city))) return false;
  if (c.district && !(eq(p.location?.district?.en, c.district) || eq(p.location?.district?.ar, c.district))) return false;
  if (c.purpose && p.purpose !== c.purpose) return false;
  if (c.types?.length && !c.types.includes(p.type)) return false;
  if (c.currency && p.currency !== c.currency) return false;
  if (c.minPrice != null && p.price < c.minPrice) return false;
  if (c.maxPrice != null && p.price > c.maxPrice) return false;
  if (c.minBedrooms != null && (p.bedrooms ?? 0) < c.minBedrooms) return false;
  if (c.furnishing && p.furnishing !== c.furnishing) return false;
  return true;
}
