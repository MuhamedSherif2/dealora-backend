import mongoose from 'mongoose';
import { WEBHOOK_STATUS } from '../config/constants.js';

// One row per event sent to n8n. Lets you see what failed and replay it.
const webhookLogSchema = new mongoose.Schema(
  {
    event: { type: String, required: true, index: true },
    payload: { type: mongoose.Schema.Types.Mixed },
    status: { type: String, enum: WEBHOOK_STATUS, default: 'pending', index: true },
    sensitive: { type: Boolean, default: false }, // payload had a secret (e.g. reset code): it is redacted here and never replayed
    attempts: { type: Number, default: 0 },
    responseStatus: Number,
    lastError: String,
  },
  { timestamps: true }
);

// auto-delete logs after 30 days
webhookLogSchema.index({ createdAt: 1 }, { expireAfterSeconds: 60 * 60 * 24 * 30 });

export const WebhookLog = mongoose.model('WebhookLog', webhookLogSchema);