import { Router } from 'express';
import { getStats } from '../controllers/dashboard.controller.js';
import { protect, restrictTo } from '../middlewares/auth.js';

const router = Router();
router.get('/stats', protect, restrictTo('agent', 'admin'), getStats);

export default router;
