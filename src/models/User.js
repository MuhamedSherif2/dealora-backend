import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import { ROLES, LANGUAGES } from '../config/constants.js';

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 100 },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    phone: { type: String, trim: true }, // E.164, e.g. +971501234567 (n8n sends WhatsApp to this)
    password: { type: String, required: true, minlength: 8, select: false },
    role: { type: String, enum: ROLES, default: 'client' },
    language: { type: String, enum: LANGUAGES, default: 'ar' },
    avatar: { url: String, publicId: String },

    // agents only
    company: { type: String, trim: true },
    licenseNumber: { type: String, trim: true }, // broker license (RERA / REGA ...)

    favorites: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Property' }],
    isActive: { type: Boolean, default: true },
    lastLoginAt: Date,

    // password reset (forgot password) — never returned by queries unless explicitly selected
    resetCodeHash: { type: String, select: false },
    resetCodeExpiresAt: { type: Date, select: false },
    resetAttempts: { type: Number, default: 0, select: false },
    // tokens issued before this moment are rejected (logs out old sessions after a reset)
    passwordChangedAt: Date,
  },
  { timestamps: true }
);

userSchema.pre('save', async function () {
  if (!this.isModified('password')) return;
  this.password = await bcrypt.hash(this.password, 12);
  if (!this.isNew) this.passwordChangedAt = new Date();
});

userSchema.methods.comparePassword = function (candidate) {
  return bcrypt.compare(candidate, this.password);
};

userSchema.set('toJSON', {
  transform: (_doc, ret) => {
    delete ret.password;
    delete ret.resetCodeHash;
    delete ret.resetCodeExpiresAt;
    delete ret.resetAttempts;
    delete ret.passwordChangedAt;
    delete ret.__v;
    return ret;
  },
});

export const User = mongoose.model('User', userSchema);