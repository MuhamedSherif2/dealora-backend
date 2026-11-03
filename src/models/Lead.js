import mongoose from 'mongoose';
import crypto from 'node:crypto';
import {LEAD_STATUS, LEAD_SOURCES, LANGUAGES, COMM_CHANNELS, MATCHING_STATUS,} from '../config/constants.js';

const noteSchema = new mongoose.Schema(
  {
    text: { type: String, required: true, trim: true, maxlength: 2000 },
    authorName: { type: String, default: 'system' },
    createdAt: { type: Date, default: Date.now },
  },
  { _id: true }
);

// One suggested property for this lead (written by n8n after its AI matching).
// The order of the array is the ranking: the best match first.
const matchSchema = new mongoose.Schema(
  {
    property: { type: mongoose.Schema.Types.ObjectId, ref: 'Property', required: true },
    score: { type: Number, min: 0, max: 100 }, // match percentage shown to the customer
    reason: { type: String, trim: true, maxlength: 300 }, // shown to the CUSTOMER: no internal notes here
  },
  { _id: false }
);

// "We sent this lead a message" — only proof that it was sent. No content, no delivery status.
const communicationSchema = new mongoose.Schema(
  {
    channel: { type: String, enum: COMM_CHANNELS, required: true },
    label: { type: String, trim: true, maxlength: 60 }, // optional short tag, e.g. "first reply", "reminder"
    sentAt: { type: Date, default: Date.now },
  },
  { _id: false }
);

const leadSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 100 },
    phone: { type: String, required: true, trim: true }, // E.164
    email: { type: String, lowercase: true, trim: true },
    message: { type: String, trim: true, maxlength: 2000 },
    language: { type: String, enum: LANGUAGES, default: 'ar' }, // n8n replies in this language

    property: { type: mongoose.Schema.Types.ObjectId, ref: 'Property' },
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, // if the lead was logged in
    assignedAgent: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },

    source: { type: String, enum: LEAD_SOURCES, default: 'website' },
    status: { type: String, enum: LEAD_STATUS, default: 'new' },
    score: { type: Number, min: 0, max: 100 }, // filled by n8n + AI (internal, never shown to the customer)
    scoreReason: { type: String, trim: true, maxlength: 500 },

    // AI property matching (filled by n8n)
    matches: { type: [matchSchema], default: [] },
    matchingStatus: { type: String, enum: MATCHING_STATUS, default: 'pending' },
    matchedAt: Date,

    // proof of the messages we sent to this lead
    communications: { type: [communicationSchema], default: [] },

    // Secret in the customer's results link: /{lang}/results/<publicToken>. It is handed out
    // once (in the response that creates the lead) and never returned by normal queries.
    publicToken: {
      type: String,
      default: () => crypto.randomBytes(24).toString('base64url'),
      select: false,
    },

    notes: [noteSchema],
    lastContactedAt: Date,
  },
  { timestamps: true }
);

leadSchema.index({ assignedAgent: 1, status: 1, createdAt: -1 });
leadSchema.index({ phone: 1, property: 1, createdAt: -1 });
leadSchema.index({ status: 1, updatedAt: 1 });
leadSchema.index({ publicToken: 1 }, { unique: true, sparse: true }); // sparse: leads created before this field existed have none

leadSchema.set('toJSON', {
  transform: (_doc, ret) => {
    delete ret.publicToken; // the token only leaves through the endpoints that explicitly return it
    delete ret.__v;
    return ret;
  },
});

export const Lead = mongoose.model('Lead', leadSchema);