import { Router } from 'express';
import {
  listUsers, createUser, updateUser, listWebhookLogs, retryWebhooks,
} from '../controllers/admin.controller.js';
import { protect, restrictTo } from '../middlewares/auth.js';
import { validate } from '../middlewares/validate.js';
import { createUserSchema, updateUserSchema } from '../validators/admin.validator.js';

const router = Router();
router.use(protect, restrictTo('admin'));

router.get('/users', listUsers);
router.post('/users', validate(createUserSchema), createUser);
router.patch('/users/:id', validate(updateUserSchema), updateUser);

router.get('/webhook-logs', listWebhookLogs);
router.post('/webhook-logs/retry', retryWebhooks);

export default router;
