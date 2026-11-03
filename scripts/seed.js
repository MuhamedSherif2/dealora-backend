// npm run seed            -> admin + agent + sample bilingual listings (Dubai)
// npm run seed:destroy    -> wipes ALL data (blocked in production)
import mongoose from 'mongoose';
import '../src/config/env.js';
import { env } from '../src/config/env.js';
import { connectDB } from '../src/config/db.js';
import { User } from '../src/models/User.js';
import { Property } from '../src/models/Property.js';
import { Lead } from '../src/models/Lead.js';
import { Viewing } from '../src/models/Viewing.js';
import { SavedSearch } from '../src/models/SavedSearch.js';
import { WebhookLog } from '../src/models/WebhookLog.js';

const img = (n) => ({ url: `https://picsum.photos/seed/re-${n}/1200/800`, publicId: `seed-${n}` });
const geo = (lat, lng) => ({ type: 'Point', coordinates: [lng, lat] });

const sample = (agent) => [
  {
    title: { en: 'Luxury 2BR apartment with Marina view', ar: 'شقة فاخرة غرفتين بإطلالة على المارينا' },
    description: {
      en: 'Bright apartment on a high floor with full marina view, close to the tram and beach.',
      ar: 'شقة مشرقة في طابق مرتفع بإطلالة كاملة على المارينا، قريبة من الترام والشاطئ.',
    },
    type: 'apartment', purpose: 'sale', price: 2150000, currency: 'AED', area: 1180, areaUnit: 'sqft',
    bedrooms: 2, bathrooms: 3, floor: 32, furnishing: 'unfurnished', isFeatured: true,
    location: {
      country: 'AE', city: { en: 'Dubai', ar: 'دبي' }, district: { en: 'Dubai Marina', ar: 'دبي مارينا' },
      geo: geo(25.0805, 55.1403),
    },
    amenities: ['pool', 'gym', 'parking', 'security', 'balcony'], images: [img(1), img(2)],
  },
  {
    title: { en: 'Modern 3BR villa with private pool', ar: 'فيلا حديثة 3 غرف مع مسبح خاص' },
    description: {
      en: 'Spacious villa in a family community with a private pool and garden.',
      ar: 'فيلا واسعة في مجتمع عائلي مع مسبح خاص وحديقة.',
    },
    type: 'villa', purpose: 'sale', price: 4300000, currency: 'AED', area: 3200, areaUnit: 'sqft',
    bedrooms: 3, bathrooms: 4, furnishing: 'unfurnished', isFeatured: true,
    location: {
      country: 'AE', city: { en: 'Dubai', ar: 'دبي' }, district: { en: 'Arabian Ranches', ar: 'المرابع العربية' },
      geo: geo(25.0536, 55.2639),
    },
    amenities: ['private pool', 'garden', 'parking', 'maid room'], images: [img(3), img(4)],
  },
  {
    title: { en: 'Furnished studio in Downtown', ar: 'استوديو مفروش في وسط المدينة' },
    description: {
      en: 'Fully furnished studio steps away from Dubai Mall and Burj Khalifa.',
      ar: 'استوديو مفروش بالكامل على بعد خطوات من دبي مول وبرج خليفة.',
    },
    type: 'studio', purpose: 'rent', rentPeriod: 'yearly', price: 78000, currency: 'AED', area: 460, areaUnit: 'sqft',
    bedrooms: 0, bathrooms: 1, furnishing: 'furnished',
    location: {
      country: 'AE', city: { en: 'Dubai', ar: 'دبي' }, district: { en: 'Downtown Dubai', ar: 'وسط مدينة دبي' },
      geo: geo(25.1972, 55.2744),
    },
    amenities: ['pool', 'gym', 'concierge'], images: [img(5)],
  },
  {
    title: { en: 'Off-plan 1BR near Dubai Creek', ar: 'شقة غرفة على الخارطة بالقرب من خور دبي' },
    description: {
      en: 'Off-plan apartment by a leading developer with a flexible 60/40 payment plan.',
      ar: 'شقة على الخارطة من مطور رائد مع خطة دفع مرنة 60/40.',
    },
    type: 'apartment', purpose: 'sale', price: 1350000, currency: 'AED', area: 780, areaUnit: 'sqft',
    bedrooms: 1, bathrooms: 2, completionStatus: 'off_plan', developer: 'Sample Developer',
    handoverDate: new Date('2028-12-31'), paymentPlan: '60/40',
    location: {
      country: 'AE', city: { en: 'Dubai', ar: 'دبي' }, district: { en: 'Dubai Creek Harbour', ar: 'ميناء خور دبي' },
      geo: geo(25.2008, 55.3445),
    },
    amenities: ['pool', 'gym', 'kids area'], images: [img(6)],
  },
  {
    title: { en: '2BR townhouse in Abu Dhabi', ar: 'تاون هاوس غرفتين في أبوظبي' },
    description: { en: 'Comfortable townhouse in a gated community.', ar: 'تاون هاوس مريح في مجتمع مغلق.' },
    type: 'townhouse', purpose: 'rent', rentPeriod: 'yearly', price: 140000, currency: 'AED', area: 1900, areaUnit: 'sqft',
    bedrooms: 2, bathrooms: 3, furnishing: 'semi_furnished',
    location: {
      country: 'AE', city: { en: 'Abu Dhabi', ar: 'أبوظبي' }, district: { en: 'Yas Island', ar: 'جزيرة ياس' },
      geo: geo(24.4672, 54.6031),
    },
    amenities: ['parking', 'security', 'community pool'], images: [img(7)],
  },
  {
    title: { en: 'Office space in Business Bay', ar: 'مساحة مكتبية في الخليج التجاري' },
    description: { en: 'Open-plan office with canal views.', ar: 'مكتب مفتوح بإطلالة على القناة.' },
    type: 'office', purpose: 'rent', rentPeriod: 'yearly', price: 95000, currency: 'AED', area: 900, areaUnit: 'sqft',
    bedrooms: 0, bathrooms: 1, furnishing: 'unfurnished',
    location: {
      country: 'AE', city: { en: 'Dubai', ar: 'دبي' }, district: { en: 'Business Bay', ar: 'الخليج التجاري' },
      geo: geo(25.1853, 55.2615),
    },
    amenities: ['parking', 'reception'], images: [img(8)],
  },
].map((p) => ({ ...p, agent: agent._id }));

async function destroy() {
  if (env.isProd) throw new Error('Refusing to wipe data in production');
  await Promise.all([User, Property, Lead, Viewing, SavedSearch, WebhookLog].map((m) => m.deleteMany({})));
  console.log('All data removed');
}

async function seed() {
  const adminEmail = process.env.SEED_ADMIN_EMAIL || 'admin@example.com';
  const adminPassword = process.env.SEED_ADMIN_PASSWORD || 'Admin@12345';

  await User.deleteOne({ email: adminEmail });
  await User.deleteOne({ email: 'agent@example.com' });
  await User.create({ name: 'Admin', email: adminEmail, password: adminPassword, role: 'admin', phone: '+971500000001' });
  const agent = await User.create({
    name: 'Sample Agent', email: 'agent@example.com', password: 'Agent@12345', role: 'agent',
    phone: '+971500000002', company: 'Sample Realty', licenseNumber: 'BRN-00000',
  });

  await Property.deleteMany({ agent: agent._id });
  await Property.create(sample(agent)); // create() => slugs are generated by the model hook

  console.log(`Seeded: admin (${adminEmail}), agent (agent@example.com), ${sample(agent).length} properties`);
}

(async () => {
  await connectDB();
  if (process.argv.includes('--destroy')) await destroy();
  else await seed();
  await mongoose.disconnect();
})().catch((err) => {
  console.error(err);
  process.exit(1);
});
