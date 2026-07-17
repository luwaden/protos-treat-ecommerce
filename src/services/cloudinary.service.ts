import { cloudinary } from "../config/cloudinary.js";

/**
 * cloudinary.service.ts
 * -----------------------------------------------------------------------
 * Small specialist wrapper — same "services do one thing well" pattern
 * as email.service.ts and paystack.service.ts. The upload itself doesn't
 * need a service (multer-storage-cloudinary handles it as middleware,
 * before any controller runs) — but DELETING an image is something a
 * controller decides to do explicitly, so it gets a proper function.
 * -----------------------------------------------------------------------
 */
export const cloudinaryService = {
  /**
   * Deletes an image from Cloudinary by its public_id.
   * Called when: a product's image is replaced with a new one (delete the
   * OLD one), or a product is deleted entirely (delete its image too).
   *
   * Deliberately swallows errors instead of throwing — a failed cleanup of
   * an old image should never block the actual product update/delete the
   * admin was trying to do. Worst case: one orphaned image sits in
   * Cloudinary, which is harmless and can be cleaned up manually later.
   */
  async deleteImage(publicId: string | null | undefined): Promise<void> {
    if (!publicId) return;
    try {
      await cloudinary.uploader.destroy(publicId);
    } catch (err) {
      console.error(`⚠️  Failed to delete Cloudinary image "${publicId}":`, err);
    }
  },
};
