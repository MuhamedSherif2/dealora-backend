import { Router } from 'express';
import { register, login, me, updateMe, forgotPassword, resetPassword, changePassword } from '../controllers/auth.controller.js';
import { protect } from '../middlewares/auth.js';
import { validate } from '../middlewares/validate.js';
import { authLimiter, passwordResetLimiter } from '../middlewares/rateLimiters.js';
import {
  registerSchema, loginSchema, updateMeSchema, forgotPasswordSchema, resetPasswordSchema,changePasswordSchema
} from '../validators/auth.validator.js';

const router = Router();

router.post('/register', authLimiter, validate(registerSchema), register);
router.post('/login', authLimiter, validate(loginSchema), login);
router.post('/forgot-password', passwordResetLimiter, validate(forgotPasswordSchema), forgotPassword);
router.post('/reset-password', passwordResetLimiter, validate(resetPasswordSchema), resetPassword);
router.get('/me', protect, me);
router.patch('/me', protect, validate(updateMeSchema), updateMe);
router.patch('/password', protect, authLimiter, validate(changePasswordSchema), changePassword);

export default router;
