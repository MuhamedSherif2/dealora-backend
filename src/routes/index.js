import { Router } from 'express';
import authRoutes from './auth.routes.js';
import propertyRoutes from './property.routes.js';
import favoriteRoutes from './favorite.routes.js';
import leadRoutes from './lead.routes.js';
import viewingRoutes from './viewing.routes.js';
import savedSearchRoutes from './savedSearch.routes.js';
import dashboardRoutes from './dashboard.routes.js';
import adminRoutes from './admin.routes.js';
import automationRoutes from './automation.routes.js';

const router = Router();

router.get('/health', (_req, res) =>
  res.json({ status: 'ok', uptime: Math.round(process.uptime()), time: new Date().toISOString() })
);

router.use('/auth', authRoutes);
router.use('/properties', propertyRoutes);
router.use('/favorites', favoriteRoutes);
router.use('/leads', leadRoutes);
router.use('/viewings', viewingRoutes);
router.use('/saved-searches', savedSearchRoutes);
router.use('/dashboard', dashboardRoutes);
router.use('/admin', adminRoutes);
router.use('/automation', automationRoutes);

export default router;
