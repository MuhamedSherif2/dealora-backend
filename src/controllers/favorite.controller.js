import { User } from '../models/User.js';
import { Property } from '../models/Property.js';
import { catchAsync } from '../utils/catchAsync.js';
import { AppError } from '../utils/AppError.js';
import { success } from '../utils/response.js';
import { localizeProperty } from '../utils/localize.js';

export const listFavorites = catchAsync(async (req, res) => {
  const user = await User.findById(req.user._id)
    .populate({
      path: 'favorites',
      match: { isActive: true },
      populate: { path: 'agent', select: 'name phone avatar company' },
    })
    .lean();
  success(res, (user.favorites || []).map((p) => localizeProperty(p, req.lang)));
});

export const addFavorite = catchAsync(async (req, res) => {
  const exists = await Property.exists({ _id: req.params.propertyId, isActive: true });
  if (!exists) throw new AppError('Property not found', 404);
  await User.updateOne({ _id: req.user._id }, { $addToSet: { favorites: req.params.propertyId } });
  success(res, { propertyId: req.params.propertyId }, { status: 201 });
});

export const removeFavorite = catchAsync(async (req, res) => {
  await User.updateOne({ _id: req.user._id }, { $pull: { favorites: req.params.propertyId } });
  res.status(204).send();
});
