import { env } from '../config/env.js';
import { LANGUAGES } from '../config/constants.js';

const normalize = (v) => {
  const code = String(v || '').slice(0, 2).toLowerCase();
  return LANGUAGES.includes(code) ? code : null;
};

// req.lang  <-  ?lang=en  |  Accept-Language header  |  DEFAULT_LANG
export const language = (req, _res, next) => {
  req.lang = normalize(req.query.lang) || normalize(req.headers['accept-language']) || env.defaultLang;
  next();
};
