import { Property } from '../models/Property.js';
import { Lead } from '../models/Lead.js';
import { Viewing } from '../models/Viewing.js';
import { catchAsync } from '../utils/catchAsync.js';
import { success } from '../utils/response.js';

const toMap = (rows) => Object.fromEntries(rows.map((r) => [r._id, r.count]));
const groupByStatus = { $group: { _id: '$status', count: { $sum: 1 } } };

// Admin sees everything, an agent sees only his own numbers
export const getStats = catchAsync(async (req, res) => {
  const isAdmin = req.user.role === 'admin';
  const propertyScope = isAdmin ? {} : { agent: req.user._id };
  const leadScope = isAdmin ? {} : { assignedAgent: req.user._id };
  const viewingScope = isAdmin ? {} : { agent: req.user._id };
  const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

  const [propertiesByStatus, leadsByStatus, leadsPerDay, upcomingViewings, totalViews] = await Promise.all([
    Property.aggregate([{ $match: propertyScope }, groupByStatus]),
    Lead.aggregate([{ $match: leadScope }, groupByStatus]),
    Lead.aggregate([
      { $match: { ...leadScope, createdAt: { $gte: since } } },
      { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } }, count: { $sum: 1 } } },
      { $sort: { _id: 1 } },
    ]),
    Viewing.countDocuments({
      ...viewingScope,
      status: { $in: ['pending', 'confirmed'] },
      scheduledAt: { $gte: new Date() },
    }),
    Property.aggregate([{ $match: propertyScope }, { $group: { _id: null, views: { $sum: '$views' } } }]),
  ]);

  const leads = toMap(leadsByStatus);
  const totalLeads = Object.values(leads).reduce((a, b) => a + b, 0);

  success(res, {
    properties: toMap(propertiesByStatus),
    leads,
    totalLeads,
    conversionRate: totalLeads ? Number((((leads.won || 0) / totalLeads) * 100).toFixed(1)) : 0,
    leadsLast30Days: leadsPerDay.map((d) => ({ date: d._id, count: d.count })),
    upcomingViewings,
    totalViews: totalViews[0]?.views ?? 0,
  });
});
