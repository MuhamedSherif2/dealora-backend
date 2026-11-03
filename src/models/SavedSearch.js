import mongoose from 'mongoose';
import { COUNTRIES, CURRENCIES, PROPERTY_TYPES, PURPOSES, FURNISHING, NOTIFY_CHANNELS } from '../config/constants.js';

const savedSearchSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  name: { type: String, trim: true, maxlength: 80 },
  criteria: {
    purpose: { type: String, enum: PURPOSES },
    types: [{ type: String, enum: PROPERTY_TYPES }],
    country: { type: String, enum: COUNTRIES },
    city: { type: String, trim: true }, // matched against city.ar or city.en
    district: { type: String, trim: true },
    currency: { type: String, enum: CURRENCIES },
    minPrice: Number,
    maxPrice: Number,
    minBedrooms: Number,
    furnishing: { type: String, enum: FURNISHING },
  },
  notifyVia: { type: [{ type: String, enum: NOTIFY_CHANNELS }], default: ['whatsapp'] },
  isActive: { type: Boolean, default: true },
  lastNotifiedAt: Date,
}, { timestamps: true });

savedSearchSchema.index({ isActive: 1, 'criteria.country': 1, 'criteria.purpose': 1 });

savedSearchSchema.set('toJSON', {
  transform: (_doc, ret) => {
    delete ret.__v;
    return ret;
  },
});

export const SavedSearch = mongoose.model('SavedSearch', savedSearchSchema);
