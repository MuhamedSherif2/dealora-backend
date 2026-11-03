# عقد الـ Webhooks بين الـ Backend و n8n

## 1) من الـ Backend إلى n8n

الـ Backend بيبعت `POST` على `N8N_WEBHOOK_URL` لكل حدث. ممكن n8n يستخدم Webhook node واحد ويفرّع بـ Switch على `event`،
أو تعمل أكتر من URL (عدّل `webhook.service.js`).

### الـ Headers
| Header | معناه |
|---|---|
| `x-webhook-secret` | نفس قيمة `N8N_WEBHOOK_SECRET`. افحصها في n8n (Header Auth أو IF node). |
| `x-webhook-signature` | `HMAC-SHA256(body, N8N_WEBHOOK_SECRET)` بصيغة hex، لو عايز تتأكد إن الجسم متغيّرش. |
| `x-webhook-event` | اسم الحدث. |
| `x-webhook-id` | نفس `id` اللي في الجسم. |

### الجسم (Envelope)
```json
{
  "id": "6720c0f1a1b2c3d4e5f60718",
  "event": "lead.created",
  "data": { },
  "sentAt": "2026-10-27T10:15:00.000Z"
}
```
- **`id` ثابت** لنفس الحدث حتى لو اتبعت تاني (retry). خزّنه في n8n وتجاهل أي `id` اتعالج قبل كده (Idempotency).
- ردّ بـ `200` بسرعة. الـ timeout عندنا 5 ثواني، و3 محاولات (انتظار 1ث ثم 2ث).
- لو n8n واقع، الحدث بيتسجل `failed` في `WebhookLog` وتقدر تعيده من `POST /api/admin/webhook-logs/retry`.

## 2) الأحداث

| الحدث | امتى | الأتمتة المقترحة |
|---|---|---|
| `lead.created` | فورم "أنا مهتم" أو lead جديد من n8n نفسه | رد واتساب فوري بلغة العميل + إشعار السمسار + حفظ في Sheets/CRM + Lead scoring |
| `lead.status_changed` | تغيير حالة الـ lead | تحديث CRM، رسائل متابعة |
| `viewing.requested` | حجز معاينة جديد | إشعار السمسار + إضافة في Google Calendar + تأكيد للعميل |
| `viewing.status_changed` | تأكيد / إلغاء / إتمام / لم يحضر | تأكيد أو إلغاء للعميل، تحديث التقويم |
| `property.created` | وحدة جديدة متاحة | نشر على السوشيال + مطابقة SavedSearch (شوف الـ endpoint تحت) |
| `property.status_changed` | وحدة اتحجزت/اتباعت/اتأجّرت | إيقاف الإعلانات |
| `user.registered` | حساب جديد | رسالة ترحيب |

### `lead.created`
```json
{
  "leadId": "6720c0f1a1b2c3d4e5f60001",
  "name": "أحمد علي",
  "phone": "+971501234567",
  "email": "ahmed@example.com",
  "message": "مهتم بالشقة، ممكن تفاصيل أكتر؟",
  "language": "ar",
  "source": "website",
  "status": "new",
  "score": null,
  "createdAt": "2026-10-27T10:15:00.000Z",
  "property": {
    "id": "6720c0f1a1b2c3d4e5f60002",
    "slug": "luxury-2br-apartment-with-marina-view-a1b2c3",
    "title": { "ar": "شقة فاخرة غرفتين بإطلالة على المارينا", "en": "Luxury 2BR apartment with Marina view" },
    "type": "apartment", "purpose": "sale", "price": 2150000, "currency": "AED",
    "area": 1180, "areaUnit": "sqft", "bedrooms": 2, "bathrooms": 3,
    "country": "AE", "city": { "ar": "دبي", "en": "Dubai" }, "district": { "ar": "دبي مارينا", "en": "Dubai Marina" },
    "status": "available",
    "image": "https://.../1.jpg",
    "url": { "ar": "http://localhost:5173/ar/properties/...", "en": "http://localhost:5173/en/properties/..." },
    "agentId": "6720c0f1a1b2c3d4e5f60003"
  },
  "agent": { "id": "6720c0f1a1b2c3d4e5f60003", "name": "Sample Agent", "phone": "+971500000002", "email": "agent@example.com" }
}
```
`property` و`agent` ممكن يبقوا `null` لو الـ lead مش مرتبط بوحدة.

### `lead.status_changed`
نفس شكل `lead.created` + `"oldStatus"` و`"newStatus"`.

### `viewing.requested` / `viewing.status_changed`
```json
{
  "viewingId": "6720c0f1a1b2c3d4e5f60010",
  "scheduledAt": "2026-10-30T14:00:00.000Z",
  "status": "pending",
  "notes": "العصر لو ممكن",
  "lead": { "id": "...", "name": "أحمد علي", "phone": "+971501234567", "email": null, "language": "ar" },
  "property": { "...نفس property summary فوق..." },
  "agent": { "id": "...", "name": "Sample Agent", "phone": "+971500000002", "email": "agent@example.com" }
}
```
`viewing.status_changed` بتضيف `oldStatus` و`newStatus`. التواريخ UTC (ISO)، حوّلها للتوقيت المحلي في رسالة العميل
(الإمارات UTC+4، السعودية/الكويت/قطر UTC+3).
حجز المعاينة بيبعت `viewing.requested` **فقط** (من غير `lead.created`) لأنه بيحمل بيانات الـ lead.

### `property.created` / `property.status_changed`
نفس property summary (`id, slug, title, price, ...`)، والتاني فيه `oldStatus` و`newStatus`.

### `user.registered`
```json
{ "userId": "...", "name": "...", "email": "...", "phone": "+9715...", "language": "ar", "role": "client" }
```

## 3) من n8n إلى الـ Backend

كل الطلبات بـ header: `x-api-key: <AUTOMATION_API_KEY>`، والـ base هو `/api/automation`.
الردود مختصرة وبلغة واحدة (`?lang=ar|en`) عشان تتحط في رسالة أو prompt مباشرة.

| Method & Path | الاستخدام |
|---|---|
| `GET /properties` | بحث للشات بوت. نفس فلاتر الموقع: `city, district, type, purpose, minPrice, maxPrice, bedrooms (3 أو 3+), furnishing, search, lat/lng/radius ...` + `page, limit (حد أقصى 20)` |
| `GET /properties/:id` | تفاصيل وحدة + السمسار |
| `GET /properties/:id/matching-searches` | بعد `property.created`: مين من المستخدمين عنده Saved Search بيطابق الوحدة دي (ومعاه لغته وتليفونه). الرد: `{ property: {ar, en}, matches: [...] }` |
| `PATCH /saved-searches/:id/notified` | تسجيل إن التنبيه اتبعت |
| `GET /saved-searches` | كل الـ Saved Searches الفعّالة |
| `POST /leads` | lead جاي من واتساب/السوشيال/الشات بوت. body: `name, phone, email?, message?, propertyId?, language?, source?` (الافتراضي `chatbot`) |
| `PATCH /leads/:id` | الـ AI يكتب النتيجة: `{ score: 0-100, scoreReason, status, note }` (أي واحد فيهم) |
| `GET /leads/stale?olderThanHours=72&status=new,contacted` | العملاء اللي محدش تابعهم (للمتابعة التلقائية) |
| `POST /viewings` | الشات بوت يحجز معاينة: `propertyId, scheduledAt (ISO), name, phone, email?, language?, notes?` |
| `GET /viewings/upcoming?withinHours=24&reminderSent=false` | المعاينات المؤكدة القريبة (للتذكير) |
| `PATCH /viewings/:id/reminder-sent` | علّم إن التذكير اتبعت (عشان مينبعتش مرتين) |

أخطاء شائعة: `401` مفتاح غلط/ناقص · `400` فشل validation (التفاصيل في `errors`) · `409` ميعاد المعاينة محجوز أو الوحدة مش متاحة · `404` مش موجود.
