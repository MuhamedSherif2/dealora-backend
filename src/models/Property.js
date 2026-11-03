import mongoose from 'mongoose';
import crypto from 'node:crypto';
import { env } from '../config/env.js';
import { slugify } from '../utils/slugify.js';
import {
  COUNTRIES, CURRENCIES, PROPERTY_TYPES, PURPOSES, RENT_PERIODS, AREA_UNITS,
  FURNISHING, COMPLETION, PROPERTY_STATUS, PAYMENT_METHODS,
} from '../config/constants.js';

// Every text the customer sees is stored in both languages.
const bilingual = { ar: { type: String, trim: true }, en: { type: String, trim: true } };

const propertySchema = new mongoose.Schema(
  {
    title: bilingual,
    description: bilingual,
    slug: { type: String, unique: true },

    type: { type: String, enum: PROPERTY_TYPES, required: true },
    purpose: { type: String, enum: PURPOSES, required: true },

    price: { type: Number, required: true, min: 0 },
    currency: { type: String, enum: CURRENCIES, default: 'AED' },
    rentPeriod: { type: String, enum: RENT_PERIODS }, // rent in the Gulf is usually yearly

    area: { type: Number, required: true, min: 0 },
    areaUnit: { type: String, enum: AREA_UNITS, default: 'sqm' }, // UAE uses sqft, KSA/KW use sqm
    bedrooms: { type: Number, min: 0, default: 0 },
    bathrooms: { type: Number, min: 0, default: 0 },
    floor: Number,
    furnishing: { type: String, enum: FURNISHING, default: 'unfurnished' },

    // off-plan is huge in Dubai
    completionStatus: { type: String, enum: COMPLETION, default: 'ready' },
    developer: { type: String, trim: true },
    handoverDate: Date,
    paymentPlan: { type: String, trim: true }, // free text, e.g. "60/40"
    // how the buyer can pay (a listing can accept several): cash / installments / mortgage
    paymentMethod: [{ type: String, enum: PAYMENT_METHODS }],

    // advertising permit (UAE Trakheesi / KSA ad license ...)
    permitNumber: { type: String, trim: true },

    location: {
      country: { type: String, enum: COUNTRIES, required: true },
      city: bilingual,
      district: bilingual,
      compound: bilingual, // the compound / community inside the district
      address: bilingual,
      // GeoJSON: coordinates = [lng, lat]
      geo: {
        type: { type: String, enum: ['Point'] },
        coordinates: { type: [Number], default: undefined },
      },
    },

    amenities: [{ type: String, trim: true }],
    images: [{ _id: false, url: { type: String, required: true }, publicId: { type: String, required: true } }],

    status: { type: String, enum: PROPERTY_STATUS, default: 'available' },
    agent: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    isFeatured: { type: Boolean, default: false },
    isActive: { type: Boolean, default: true },
    views: { type: Number, default: 0 },
  },
  { timestamps: true }
);

// ---- indexes ----
propertySchema.index({ 'location.geo': '2dsphere' });
propertySchema.index({ isActive: 1, status: 1, purpose: 1, 'location.country': 1, 'location.city.en': 1, price: 1 });
propertySchema.index({ agent: 1, createdAt: -1 });
propertySchema.index({ isFeatured: -1, createdAt: -1 });
propertySchema.index(
  {
    'title.ar': 'text', 'title.en': 'text',
    'description.ar': 'text', 'description.en': 'text',
    'location.city.ar': 'text', 'location.city.en': 'text',
    'location.district.ar': 'text', 'location.district.en': 'text',
  },
  {
    default_language: 'none', // no stemming => works for Arabic and English
    weights: { 'title.ar': 10, 'title.en': 10, 'location.district.ar': 5, 'location.district.en': 5 },
  }
);

propertySchema.pre('validate', function () {
  if (!this.title?.ar && !this.title?.en) this.invalidate('title', 'Title is required in at least one language');

  if (!this.slug) {
    const base = slugify(this.title?.en) || 'property';
    this.slug = `${base}-${crypto.randomBytes(3).toString('hex')}`;
  }
  if (this.purpose === 'rent' && !this.rentPeriod) this.rentPeriod = 'yearly';
  if (this.purpose === 'sale') this.rentPeriod = undefined;

  if (env.requirePermitNumber && this.status === 'available' && !this.permitNumber) {
    this.invalidate('permitNumber', 'Permit number is required to publish a listing');
  }
});

propertySchema.set('toJSON', {
  transform: (_doc, ret) => {
    delete ret.__v;
    return ret;
  },
});

export const Property = mongoose.model('Property', propertySchema);
