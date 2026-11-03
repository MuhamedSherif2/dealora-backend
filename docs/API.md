# API Reference

Base: `/api` · Auth: `Authorization: Bearer <token>` · Language: `?lang=ar|en` أو `Accept-Language`.

**الرد الناجح:** `{ "status": "success", "data": ..., "meta"?: { page, limit, total, pages } }`
**الرد الفاشل:** `{ "status": "fail" | "error", "message": "...", "errors"?: [{ path, message }] }`

الصلاحيات: 🌐 عام · 👤 أي مستخدم مسجّل · 🏢 agent/admin · 👑 admin · 🤖 n8n (`x-api-key`)

## Auth
| | | |
|---|---|---|
| POST | `/auth/register` | 🌐 `name, email, phone?, password (8+), language?` → `{ token, user }` |
| POST | `/auth/login` | 🌐 `email, password` |
| GET | `/auth/me` | 👤 |
| PATCH | `/auth/me` | 👤 `name?, phone?, language?` |
| PATCH | `/auth/password` | 👤 `currentPassword, newPassword` |

## Properties
| | | |
|---|---|---|
| GET | `/properties` | 🌐 قائمة + فلاتر (تحت) |
| GET | `/properties/featured` | 🌐 |
| GET | `/properties/:idOrSlug` | 🌐 (بيزوّد `views`) |
| GET | `/properties/manage/list` | 🏢 وحداتي (الأدمن: الكل، شامل غير المفعّل) |
| POST | `/properties` | 🏢 |
| PATCH | `/properties/:id` | 🏢 تعديل جزئي (ممكن تبعت `location.city.en` لوحدها) |
| PATCH | `/properties/:id/status` | 🏢 `status` |
| POST | `/properties/:id/images` | 🏢 `multipart/form-data` الحقل `images` (حتى 10 × 5MB، الحد 20 صورة للوحدة، الأولى هي الغلاف) |
| DELETE | `/properties/:id/images` | 🏢 body `{ publicId }` |
| DELETE | `/properties/:id` | 🏢 |

السمسار يعدّل وحداته بس. الأدمن يقدر يحدد `agent` عند الإنشاء.

### فلاتر `GET /properties`
`country` (AE…) · `city` · `district` (عربي أو إنجليزي) · `type` (قائمة بفواصل) · `purpose` (sale/rent) · `currency` ·
`minPrice` `maxPrice` · `bedrooms` (`3` أو `1,2` أو `4+`) · `minBathrooms` · `minArea` `maxArea` · `furnishing` ·
`completionStatus` (ready/off_plan) · `amenities` (كلهم لازم يتوفروا) · `isFeatured=true` · `search` (بحث نصي عربي/إنجليزي) ·
`lat` `lng` `radius` (كم، الافتراضي 5) · `status` (العام يشوف available/reserved بس) ·
`sort`: `newest | oldest | price_asc | price_desc | area_desc | popular` · `page` `limit` (الحد الأقصى 50)

## Favorites · Saved searches
| | | |
|---|---|---|
| GET | `/favorites` | 👤 |
| POST / DELETE | `/favorites/:propertyId` | 👤 |
| GET / POST | `/saved-searches` | 👤 `{ name?, criteria: { country, city, district, purpose, types[], currency, minPrice, maxPrice, minBedrooms, furnishing }, notifyVia?: ["whatsapp","email"] }` (حد أقصى 10) |
| PATCH / DELETE | `/saved-searches/:id` | 👤 |

## Leads
| | | |
|---|---|---|
| POST | `/leads` | 🌐 `name, phone, email?, message?, propertyId?, language?` (محدود 15 طلب/ساعة) |
| GET | `/leads` | 🏢 `status, source, minScore, search, property, agent(admin)` |
| GET | `/leads/:id` | 🏢 |
| PATCH | `/leads/:id` | 🏢 `status, score, scoreReason, assignedAgent(admin only)` |
| POST | `/leads/:id/notes` | 🏢 `{ text }` |

## Viewings
| | | |
|---|---|---|
| POST | `/viewings` | 🌐/👤 `propertyId, scheduledAt (ISO, مستقبلي), name+phone (للزائر), email?, language?, notes?` |
| GET | `/viewings` | 👤 العميل: معاينته · السمسار: معاينات وحداته · الأدمن: الكل. `status, from, to, upcoming=true` |
| PATCH | `/viewings/:id` | 👤 `status?, scheduledAt?, notes?`. العميل يقدر **يلغي** معاينته بس |

انتقالات الحالة: `pending → confirmed|cancelled` · `confirmed → completed|cancelled|no_show`.
السمسار مينفعش يكون عنده معاينتين في نفس الساعة (`409`).

## Dashboard · Admin
| | | |
|---|---|---|
| GET | `/dashboard/stats` | 🏢 أرقام الوحدات والـ leads ومعدل التحويل وآخر 30 يوم (السمسار يشوف أرقامه بس) |
| GET / POST | `/admin/users` | 👑 `role, search` · الإنشاء: `name, email, password, role (الافتراضي agent), phone?, company?, licenseNumber?` |
| PATCH | `/admin/users/:id` | 👑 |
| GET | `/admin/webhook-logs` | 👑 `status, event` |
| POST | `/admin/webhook-logs/retry` | 👑 إعادة إرسال الأحداث الفاشلة |

## Automation 🤖
شوف `docs/WEBHOOKS.md` القسم 3.

## مثال: إنشاء وحدة
```http
POST /api/properties
Authorization: Bearer <agent token>

{
  "title": { "ar": "شقة غرفتين بإطلالة بحرية", "en": "2BR apartment with sea view" },
  "description": { "ar": "شقة مشرقة في طابق مرتفع...", "en": "Bright high-floor apartment..." },
  "type": "apartment", "purpose": "rent", "rentPeriod": "yearly",
  "price": 120000, "currency": "AED", "area": 1100, "areaUnit": "sqft",
  "bedrooms": 2, "bathrooms": 2, "furnishing": "furnished",
  "permitNumber": "123456",
  "location": {
    "country": "AE",
    "city": { "ar": "دبي", "en": "Dubai" },
    "district": { "ar": "جي بي آر", "en": "JBR" },
    "coordinates": { "lat": 25.0777, "lng": 55.1330 }
  },
  "amenities": ["pool", "gym", "parking"]
}
```
