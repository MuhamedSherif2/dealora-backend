import multer from 'multer';
import { AppError } from '../utils/AppError.js';

// Files are kept in memory and streamed to Cloudinary (nothing is written to disk)
export const uploadImages = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024, files: 10 },
  fileFilter: (_req, file, cb) =>
    file.mimetype.startsWith('image/') ? cb(null, true) : cb(new AppError('Only image files are allowed', 400)),
}).array('images', 10);
