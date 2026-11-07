import { Router } from 'express';
import {
  getProperties, getFeatured, getProperty, getManagedProperties, createProperty,
  updateProperty, updateStatus, deleteProperty, addImages, removeImage,getCities029346
} from '../controllers/property.controller.js';
import { protect, optionalAuth, restrictTo } from '../middlewares/auth.js';
import { validate } from '../middlewares/validate.js';
import { uploadImages } from '../middlewares/upload.js';
import { parseMultipartData } from '../middlewares/parseMultipartData.js';
import {
  createPropertySchema, updatePropertySchema, updateStatusSchema, removeImageSchema,
} from '../validators/property.validator.js';

const router = Router();
const staff = [protect, restrictTo('agent', 'admin')];

// public
router.get('/', getProperties);
router.get('/featured', getFeatured);
router.get('/cities', getCities);

// agent / admin dashboard (must be before /:idOrSlug)
router.get('/manage/list', ...staff, getManagedProperties);
// JSON (no images) or multipart/form-data: "data" = JSON string with the fields, "images" = files
router.post('/', ...staff, uploadImages, parseMultipartData, validate(createPropertySchema), createProperty);

router.get('/:idOrSlug', optionalAuth, getProperty);
router.patch('/:id', ...staff, validate(updatePropertySchema), updateProperty);
router.patch('/:id/status', ...staff, validate(updateStatusSchema), updateStatus);
router.post('/:id/images', ...staff, uploadImages, addImages);
router.delete('/:id/images', ...staff, validate(removeImageSchema), removeImage);
router.delete('/:id', ...staff, deleteProperty);

export default router;