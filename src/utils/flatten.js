// { location: { city: { en: 'X' } } }  ->  { 'location.city.en': 'X' }
// Lets us do partial updates of nested bilingual fields without wiping siblings.
export function flatten(obj, prefix = '', out = {}) {
  for (const [key, value] of Object.entries(obj)) {
    const path = prefix ? `${prefix}.${key}` : key;
    if (value && typeof value === 'object' && !Array.isArray(value) && !(value instanceof Date)) {
      flatten(value, path, out);
    } else {
      out[path] = value;
    }
  }
  return out;
}
