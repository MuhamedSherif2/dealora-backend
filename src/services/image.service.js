import { cloudinary, isCloudinaryConfigured } from '../config/cloudinary.js';
import { AppError } from '../utils/AppError.js';

export function uploadBuffer(buffer, folder = 'properties') {
  if (!isCloudinaryConfigured()) throw new AppError('Image storage is not configured', 503);
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        folder: `real-estate/${folder}`,
        resource_type: 'image',
        transformation: [{ width: 1920, crop: 'limit', quality: 'auto', fetch_format: 'auto' }],
      },
      (err, result) => (err ? reject(err) : resolve({ url: result.secure_url, publicId: result.public_id }))
    );
    stream.end(buffer);
  });
}

export async function deleteImage(publicId) {
  if (!isCloudinaryConfigured() || !publicId) return;
  try {
    await cloudinary.uploader.destroy(publicId);
  } catch (err) {
    console.error(`Failed to delete image ${publicId}:`, err.message);
  }
}

// Uploads several files. If any upload fails, the ones that already succeeded are deleted,
// so a failed request never leaves orphan images on Cloudinary.
export async function uploadMany(files = [], folder = 'properties') {
  const results = await Promise.allSettled(files.map((f) => uploadBuffer(f.buffer, folder)));
  const uploaded = results.filter((r) => r.status === 'fulfilled').map((r) => r.value);
  const failed = results.find((r) => r.status === 'rejected');
  if (failed) {
    await Promise.allSettled(uploaded.map((img) => deleteImage(img.publicId)));
    throw failed.reason;
  }
  return uploaded;
}
