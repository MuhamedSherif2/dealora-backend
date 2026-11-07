import { Property } from '../models/Property.js';
import { User } from '../models/User.js';
import { catchAsync } from '../utils/catchAsync.js';
import { AppError } from '../utils/AppError.js';
import { success } from '../utils/response.js';
import { parsePagination, paginationMeta } from '../utils/pagination.js';
import { buildPropertyFilter, buildSort } from '../utils/propertyFilters.js';
import { localizeProperty } from '../utils/localize.js';
import { flatten } from '../utils/flatten.js';
import { EVENTS } from '../config/constants.js';
import { uploadMany, deleteImage } from '../services/image.service.js';
import { emitEvent } from '../services/webhook.service.js';
import { propertySummary } from '../services/webhook.payloads.js';

const AGENT_FIELDS = 'name phone avatar company licenseNumber';
const MAX_IMAGES = 20;
const OBJECT_ID = /^[0-9a-fA-F]{24}$/;

// location.coordinates {lat,lng}  ->  location.geo (GeoJSON [lng,lat])
function normalizeLocation(body) {
  const coords = body.location?.coordinates;
  if (coords) {
    body.location.geo = { type: 'Point', coordinates: [coords.lng, coords.lat] };
    delete body.location.coordinates;
  }
  return body;
}

async function listProperties(req, res, filter) {
  const { page, limit, skip } = parsePagination(req.query);
  const [items, total] = await Promise.all([
    Property.find(filter)
      .sort(buildSort(req.query.sort))
      .skip(skip)
      .limit(limit)
      .populate('agent', AGENT_FIELDS)
      .lean(),
    Property.countDocuments(filter),
  ]);
  success(res, items.map((p) => localizeProperty(p, req.lang)), { meta: paginationMeta({ page, limit }, total) });
}

// agents can only touch their own listings; admins can touch everything
async function findManaged(req) {
  const property = await Property.findById(req.params.id);
  if (!property) throw new AppError('Property not found', 404);
  if (req.user.role !== 'admin' && String(property.agent) !== String(req.user._id)) {
    throw new AppError('You can only manage your own listings', 403);
  }
  return property;
}

const statusChangedPayload = (property, oldStatus) => ({
  ...propertySummary(property),
  oldStatus,
  newStatus: property.status,
});

// ---------- public ----------
export const getProperties = catchAsync(async (req, res) => listProperties(req, res, buildPropertyFilter(req.query)));

export const getFeatured = catchAsync(async (req, res) => {
  const items = await Property.find({ isActive: true, isFeatured: true, status: 'available' })
    .sort({ createdAt: -1 })
    .limit(8)
    .populate('agent', AGENT_FIELDS)
    .lean();
  success(res, items.map((p) => localizeProperty(p, req.lang)));
});

export const getProperty = catchAsync(async (req, res) => {
  const { idOrSlug } = req.params;
  const query = OBJECT_ID.test(idOrSlug) ? { _id: idOrSlug } : { slug: idOrSlug };
  const isStaff = ['agent', 'admin'].includes(req.user?.role);

  let property;
  if (isStaff) {
    property = await Property.findOne(query).populate('agent', AGENT_FIELDS).lean();
  } else {
    property = await Property.findOneAndUpdate(
      { ...query, isActive: true },
      { $inc: { views: 1 } },
      { new: true }
    )
      .populate('agent', AGENT_FIELDS)
      .lean();
  }
  if (!property) throw new AppError('Property not found', 404);
  success(res, localizeProperty(property, req.lang));
});

// ---------- agent / admin ----------
export const getManagedProperties = catchAsync(async (req, res) => {
  const filter = buildPropertyFilter(req.query, { publicOnly: false });
  if (req.user.role === 'agent') filter.agent = req.user._id;
  return listProperties(req, res, filter);
});

export const createProperty = catchAsync(async (req, res) => {
  const body = normalizeLocation(req.body);
  body.agent = req.user.role === 'admin' && body.agent ? body.agent : req.user._id;

  // Images (optional) arrive in the same multipart request. Order matters:
  // Zod already validated the fields -> upload the images -> create the listing -> emit the event,
  // so n8n never receives a property.created without its photos.
  const uploaded = req.files?.length ? await uploadMany(req.files) : [];
  let property;
  try {
    property = await Property.create({ ...body, images: uploaded });
  } catch (err) {
    await Promise.allSettled(uploaded.map((img) => deleteImage(img.publicId))); // don't leave orphan images
    throw err;
  }
  await property.populate('agent', 'name phone email');
  if (property.status === 'available') emitEvent(EVENTS.PROPERTY_CREATED, propertySummary(property));
  success(res, localizeProperty(property, req.lang), { status: 201 });
});

export const updateProperty = catchAsync(async (req, res) => {
  const property = await findManaged(req);
  const oldStatus = property.status;

  const body = normalizeLocation(req.body);
  if (req.user.role !== 'admin') delete body.agent;

  property.set(flatten(body)); // partial update, nested fields keep their siblings
  await property.save();

  if (property.status !== oldStatus) emitEvent(EVENTS.PROPERTY_STATUS_CHANGED, statusChangedPayload(property, oldStatus));
  success(res, localizeProperty(property, req.lang));
});

export const updateStatus = catchAsync(async (req, res) => {
  const property = await findManaged(req);
  const oldStatus = property.status;
  property.status = req.body.status;
  await property.save();

  if (property.status !== oldStatus) emitEvent(EVENTS.PROPERTY_STATUS_CHANGED, statusChangedPayload(property, oldStatus));
  success(res, localizeProperty(property, req.lang));
});

export const deleteProperty = catchAsync(async (req, res) => {
  const property = await findManaged(req);
  await Promise.allSettled(property.images.map((img) => deleteImage(img.publicId)));
  await property.deleteOne();
  await User.updateMany({ favorites: property._id }, { $pull: { favorites: property._id } });
  res.status(204).send();
});

export const addImages = catchAsync(async (req, res) => {
  const property = await findManaged(req);
  if (!req.files?.length) throw new AppError('Send at least one image in the "images" field', 400);
  if (property.images.length + req.files.length > MAX_IMAGES) {
    throw new AppError(`A listing can have at most ${MAX_IMAGES} images`, 400);
  }

  const uploaded = await uploadMany(req.files);
  property.images.push(...uploaded); // the first image is the cover
  await property.save();
  success(res, { images: property.images }, { status: 201 });
});

export const removeImage = catchAsync(async (req, res) => {
  const property = await findManaged(req);
  const { publicId } = req.body;
  const exists = property.images.some((i) => i.publicId === publicId);
  if (!exists) throw new AppError('Image not found on this property', 404);

  await deleteImage(publicId);
  property.images = property.images.filter((i) => i.publicId !== publicId);
  await property.save();
  success(res, { images: property.images });
});

// cities that actually have public listings, most listings first
export const getCities = catchAsync(async (req, res) => {
  const cities = await Property.aggregate([
    { $match: { isActive: true, status: { $in: ['available', 'reserved'] } } },
    { $sort: { createdAt: -1 } },
    {
      $group: {
        _id: { country: '$location.country', ar: '$location.city.ar', en: '$location.city.en' },
        count: { $sum: 1 },
        image: { $first: { $arrayElemAt: ['$images.url', 0] } },
      },
    },
    { $sort: { count: -1 } },
    { $limit: 8 },
    {
      $project: {
        _id: 0, count: 1, image: { $ifNull: ['$image', null] },
        country: '$_id.country', city: { ar: '$_id.ar', en: '$_id.en' },
      },
    },
  ]);
  success(res, cities);
});