import { SavedSearch } from '../models/SavedSearch.js';
import { catchAsync } from '../utils/catchAsync.js';
import { AppError } from '../utils/AppError.js';
import { success } from '../utils/response.js';

const MAX_PER_USER = 10;

export const listSavedSearches = catchAsync(async (req, res) => {
  success(res, await SavedSearch.find({ user: req.user._id }).sort({ createdAt: -1 }));
});

export const createSavedSearch = catchAsync(async (req, res) => {
  if ((await SavedSearch.countDocuments({ user: req.user._id })) >= MAX_PER_USER) {
    throw new AppError(`You can save up to ${MAX_PER_USER} searches`, 400);
  }
  success(res, await SavedSearch.create({ ...req.body, user: req.user._id }), { status: 201 });
});

export const updateSavedSearch = catchAsync(async (req, res) => {
  const search = await SavedSearch.findOne({ _id: req.params.id, user: req.user._id });
  if (!search) throw new AppError('Saved search not found', 404);
  search.set(req.body);
  await search.save();
  success(res, search);
});

export const deleteSavedSearch = catchAsync(async (req, res) => {
  const result = await SavedSearch.deleteOne({ _id: req.params.id, user: req.user._id });
  if (!result.deletedCount) throw new AppError('Saved search not found', 404);
  res.status(204).send();
});
