const other = (lang) => (lang === 'ar' ? 'en' : 'ar');
const pick = (v, lang) => (v && typeof v === 'object' ? v[lang] || v[other(lang)] || '' : v);

// Adds an `i18n` block with the requested language (falls back to the other one).
// Both languages stay in the response, so the frontend can use either.
export function localizeProperty(p, lang = 'ar') {
  const o = typeof p.toObject === 'function' ? p.toObject() : p;
  const geo = o.location?.geo?.coordinates;
  return {
    ...o,
    i18n: {
      lang,
      title: pick(o.title, lang),
      description: pick(o.description, lang),
      city: pick(o.location?.city, lang),
      district: pick(o.location?.district, lang),
      compound: pick(o.location?.compound, lang),
      address: pick(o.location?.address, lang),
      coordinates: geo?.length === 2 ? { lat: geo[1], lng: geo[0] } : null,
    },
  };
}
