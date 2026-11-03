# Real Estate Backend

API لمنصة عقارات للسوق الخليجي (ثنائية اللغة عربي/إنجليزي) مع ربط جاهز بـ n8n.
**Stack:** Node.js (ESM) · Express 4 · MongoDB/Mongoose · JWT · Zod · Cloudinary.

## التشغيل

```bash
cp .env.example .env        # عدّل JWT_SECRET و MONGO_URI على الأقل
npm install
npm run seed                # أدمن + سمسار + 6 وحدات تجريبية (دبي)
npm run dev                 # http://localhost:5000/api/health
```

حسابات الـ seed: `admin@example.com / Admin@12345` و `agent@example.com / Agent@12345`.
(غيّرهم قبل أي نشر.) أمر `npm run seed:destroy` بيمسح كل الداتا ومش بيشتغل في production.

## الهيكل

```
real-estate-backend/
├── server.js                 نقطة التشغيل: اتصال DB + تشغيل السيرفر + shutdown نضيف
├── scripts/seed.js           داتا تجريبية
├── docs/
│   ├── API.md                كل الـ endpoints
│   └── WEBHOOKS.md           العقد بينك وبين n8n (الأحداث + الـ payloads)
└── src/
    ├── app.js                إعداد Express (helmet, cors, sanitize, limiter, routes, errors)
    ├── config/               env (فحص المتغيرات) · db · cloudinary · constants (كل الـ enums)
    ├── models/               User · Property · Lead · Viewing · SavedSearch · WebhookLog
    ├── routes/               تعريف الـ URLs + الـ middlewares لكل route (بدون منطق)
    ├── controllers/          معالجة الـ request/response
    ├── services/             المنطق المشترك: webhook · lead · viewing · image · payloads
    ├── validators/           Zod schemas لكل input
    ├── middlewares/          auth · validate · errorHandler · rateLimiters · upload · language · verifyAutomationKey
    └── utils/                AppError · catchAsync · filters · pagination · phone · localize ...
```

**مسار الـ request:** `route → (limiter) → auth/role → validate (zod) → controller → service/model → response`.
أي خطأ بيروح لـ `errorHandler` وبيرجع JSON موحّد: `{ status, message, errors? }`.

## القرارات المهمة في التصميم

- **ثنائية اللغة:** النصوص (title, description, city, district, address) محفوظة `{ ar, en }`. كل response فيه كمان `i18n` باللغة المطلوبة (`?lang=` أو `Accept-Language`) مع fallback للغة التانية.
- **الخليج:** عملات متعددة، `areaUnit` (sqft/sqm)، `rentPeriod` (غالباً yearly)، off-plan (`developer`, `handoverDate`, `paymentPlan`)، و`permitNumber`. لو الترخيص إلزامي في سوقك فعّل `REQUIRE_PERMIT_NUMBER=true`. **راجع متطلبات كل دولة بنفسك قبل الإطلاق.**
- **التليفونات** بتتخزن E.164 (`+971...`) وبتتحوّل تلقائي من الأرقام العربية والمسافات و`00`. دي اللي n8n بيبعت عليها واتساب.
- **الـ Webhooks مش بتعطّل أي request:** `emitEvent()` بتتنده من غير `await` ومبترميش error. كل محاولة بتتسجل في `WebhookLog` (3 محاولات، وفي `POST /api/admin/webhook-logs/retry` لإعادة الفاشل).
- **منع التكرار:** نفس التليفون + نفس الوحدة خلال 24 ساعة = نفس الـ Lead (الرسالة بتتضاف كملاحظة) فمفيش أتمتة بتشتغل مرتين.
- **صلاحيات:** `client` · `agent` (وحداته وعملاؤه بس) · `admin` (كل حاجة). التسجيل العام بيعمل `client` فقط، والسماسرة بيتعملوا من الأدمن.
- **n8n بيدخل بـ API Key** (`x-api-key`) منفصل عن الـ JWT، وعلى `/api/automation/*` بس.

## اللي مش موجود لسه

لا اختبارات آلية (Jest/Supertest)، ولا Postman collection أو OpenAPI، ولا Docker. دول الخطوة الجاية المنطقية.
