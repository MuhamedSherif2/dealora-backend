import { env } from '../config/env.js';

export const propertyUrl = (property, lang = env.defaultLang) =>
  `${env.clientUrl}/${lang}/properties/${property.slug}`;

// the customer's private page with the properties n8n matched for him
export const resultsUrl = (token, lang = env.defaultLang) => `${env.clientUrl}/${lang}/results/${token}`;
