import mongoose from 'mongoose';
import { VIEWING_STATUS } from '../config/constants.js';

const viewingSchema = new mongoose.Schema({
  property: { type: mongoose.Schema.Types.ObjectId, ref: 'Property', required: true },
  lead: { type: mongoose.Schema.Types.ObjectId, ref: 'Lead', required: true },
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  agent: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },

  scheduledAt: { type: Date, required: true },
  status: { type: String, enum: VIEWING_STATUS, default: 'pending' },
  notes: { type: String, trim: true, maxlength: 1000 },

  reminderSent: { type: Boolean, default: false }, // so n8n doesn't remind twice
}, { timestamps: true });

viewingSchema.index({ agent: 1, scheduledAt: 1 });
viewingSchema.index({ status: 1, scheduledAt: 1, reminderSent: 1 });
viewingSchema.index({ user: 1, scheduledAt: -1 });

viewingSchema.set('toJSON', {
  transform: (_doc, ret) => {
    delete ret.__v;
    return ret;
  },
});

export const Viewing = mongoose.model('Viewing', viewingSchema);
