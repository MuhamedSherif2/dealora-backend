import 'dotenv/config';

const get = (key, fallback) => process.env[key] ?? fallback;
const required = (key) => {
  const value = process.env[key];
  if (!value) throw new Error(`Missing required env var: ${key}`);
  return value;
};

const nodeEnv = get('NODE_ENV', 'development');
const clientUrls = get('CLIENT_URL', 'http://localhost:5173')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean);

export const env = {
  nodeEnv,
  isProd: nodeEnv === 'production',
  port: Number(get('PORT', 5000)),
  mongoUri: get('MONGO_URI', 'mongodb://127.0.0.1:27017/real_estate'),
  jwtSecret: required('JWT_SECRET'),
  jwtExpiresIn: get('JWT_EXPIRES_IN', '7d'),
  clientUrls,
  clientUrl: clientUrls[0],
  defaultLang: get('DEFAULT_LANG', 'ar'),
  defaultCountry: get('DEFAULT_COUNTRY', 'AE'),
  requirePermitNumber: get('REQUIRE_PERMIT_NUMBER', 'false') === 'true',
  cloudinary: {
    cloudName: get('CLOUDINARY_CLOUD_NAME', ''),
    apiKey: get('CLOUDINARY_API_KEY', ''),
    apiSecret: get('CLOUDINARY_API_SECRET', ''),
  },
  n8n: {
    webhookUrl: get('N8N_WEBHOOK_URL', ''),
    webhookSecret: get('N8N_WEBHOOK_SECRET', ''),
  },
  automationApiKey: get('AUTOMATION_API_KEY', ''),
};
