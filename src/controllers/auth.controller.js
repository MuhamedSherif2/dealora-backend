import { User } from '../models/User.js';
import { catchAsync } from '../utils/catchAsync.js';
import { AppError } from '../utils/AppError.js';
import { signToken } from '../utils/jwt.js';
import { success } from '../utils/response.js';
import { EVENTS } from '../config/constants.js';
import { emitEvent } from '../services/webhook.service.js';
import { userPayload } from '../services/webhook.payloads.js';

export const register = catchAsync(async (req, res) => {
  const { name, email, phone, password, language } = req.body;
  // public registration always creates a "client"; agents/admins are created by an admin
  const user = await User.create({ name, email, phone, password, language, role: 'client' });
  emitEvent(EVENTS.USER_REGISTERED, userPayload(user));
  success(res, { user }, { status: 201 }); // no token here: the client logs in next
});

export const login = catchAsync(async (req, res) => {
  const { email, password } = req.body;
  const user = await User.findOne({ email }).select('+password');
  if (!user || !(await user.comparePassword(password))) throw new AppError('Invalid email or password', 401);
  if (!user.isActive) throw new AppError('This account is disabled', 403);

  user.lastLoginAt = new Date();
  await user.save({ validateModifiedOnly: true });
  success(res, { token: signToken(user), user });
});

export const me = catchAsync(async (req, res) => success(res, { user: req.user }));

export const updateMe = catchAsync(async (req, res) => {
  req.user.set(req.body);
  await req.user.save({ validateModifiedOnly: true });
  success(res, { user: req.user });
});
// ---------------- forgot / reset password ----------------

const FORGOT_REPLY = 'If an account exists for this email, a verification code has been sent';
const invalidCode = () => new AppError('Invalid or expired code', 400);


/**
 * Step 1 — the user types his email. We generate a 6-digit code, store only its hash,
 * and send a `password.reset_requested` event to n8n, which delivers the code on
 * WhatsApp (or email when the account has no phone).
 * The reply is always the same, so nobody can use this endpoint to find out which emails are registered.
 */
export const forgotPassword = catchAsync(async (req, res) => {
  const user = await User.findOne({ email: req.body.email, isActive: true }).select('+resetCodeExpiresAt');

  if (user) {
    const sentRecently =
      user.resetCodeExpiresAt &&
      user.resetCodeExpiresAt.getTime() - Date.now() > RESET_CODE_TTL_MS - RESEND_COOLDOWN_MS;

    if (!sentRecently) {
      const code = generateResetCode();
      user.resetCodeHash = hashResetCode(code);
      user.resetCodeExpiresAt = new Date(Date.now() + RESET_CODE_TTL_MS);
      user.resetAttempts = 0;
      await user.save({ validateModifiedOnly: true });

      emitEvent(
        EVENTS.PASSWORD_RESET_REQUESTED,
        {
          userId: String(user._id),
          name: user.name,
          email: user.email,
          phone: user.phone ?? null,
          language: user.language,
          code,
          expiresInMinutes: RESET_CODE_TTL_MS / 60000,
          preferredChannel: user.phone ? 'whatsapp' : 'email',
        },
        { sensitive: true, redact: ['code'] } // the code is sent to n8n but never stored in WebhookLog
      );

      // local development without n8n: print the code so you can test the flow
      if (!env.isProd && !env.n8n.webhookUrl) console.log(`[dev] password reset code for ${user.email}: ${code}`);
    }
  }

  success(res, null, { message: FORGOT_REPLY });
});

/**
 * Step 2 — email + code + new password.
 * Every failure returns the same 400, and the code is burned after too many wrong guesses.
 */
export const resetPassword = catchAsync(async (req, res) => {
  const { email, code, newPassword } = req.body;
  const user = await User.findOne({ email }).select('+password +resetCodeHash +resetCodeExpiresAt +resetAttempts');

  if (!user || !user.isActive || !user.resetCodeHash || !user.resetCodeExpiresAt) throw invalidCode();
  if (user.resetCodeExpiresAt < new Date() || user.resetAttempts >= MAX_RESET_ATTEMPTS) throw invalidCode();

  if (!codesMatch(code, user.resetCodeHash)) {
    user.resetAttempts += 1;
    if (user.resetAttempts >= MAX_RESET_ATTEMPTS) {
      user.resetCodeHash = undefined;
      user.resetCodeExpiresAt = undefined;
    }
    await user.save({ validateModifiedOnly: true });
    throw invalidCode();
  }

  user.password = newPassword; // hashed by the model hook; also sets passwordChangedAt (old tokens stop working)
  user.resetCodeHash = undefined;
  user.resetCodeExpiresAt = undefined;
  user.resetAttempts = 0;
  await user.save();

  success(res, null, { message: 'Password updated. Please log in with your new password.' });
});

export const changePassword = catchAsync(async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  const user = await User.findById(req.user._id).select('+password');

  if (!(await user.comparePassword(currentPassword))) throw new AppError('Current password is incorrect', 400);
  if (currentPassword === newPassword) throw new AppError('New password must be different', 400);

  user.password = newPassword; // hashed by the hook; old tokens stop working
  await user.save();

  // old tokens are now invalid, so return a fresh one for this session
  success(res, { token: signToken(user) }, { message: 'Password updated' });
});