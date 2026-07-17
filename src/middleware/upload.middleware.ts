import multer from "multer";
import { CloudinaryStorage } from "multer-storage-cloudinary";
import { cloudinary } from "../config/cloudinary.js";

/**
 * upload.middleware.ts
 * -----------------------------------------------------------------------
 * Full explanation (with a diagram of the whole request) lives in
 * IMAGE_UPLOAD_EXPLAINED.md in the project root — read that first if
 * anything here is unclear. Short version:
 *
 * Multer is the piece that understands `multipart/form-data` — the
 * special request format browsers use to send FILES (Express's normal
 * `express.json()` middleware only understands JSON text, it cannot
 * read a file). `multer-storage-cloudinary` is a plug-in "storage
 * engine" for Multer: instead of saving the uploaded file to a folder
 * on THIS server's disk, it streams it straight to Cloudinary and hands
 * Multer back the Cloudinary URL — so by the time our route handler
 * runs, the image is already live on Cloudinary, and `req.file` already
 * contains its permanent URL.
 * -----------------------------------------------------------------------
 */

const storage = new CloudinaryStorage({
  cloudinary,
  params: async () => ({
    folder: "protos-treat/products", // keeps this project's images in their own Cloudinary folder
    allowed_formats: ["jpg", "jpeg", "png", "webp"],
    transformation: [{ width: 1000, height: 1000, crop: "limit" }], // never store an image larger than this
  }),
});

/**
 * `uploadProductImage` — Express middleware, ready to drop into a route:
 *
 *   router.post("/upload/product-image", protect, authorize(UserRole.Admin),
 *               uploadProductImage, adminController.uploadProductImage);
 *
 * `.single("image")` means: "expect exactly ONE file, sent under the
 * form field named 'image'". After this middleware runs, the route
 * handler can read `req.file.path` (the Cloudinary URL) and
 * `req.file.filename` (the Cloudinary public_id, needed later to delete
 * the image).
 */
export const uploadProductImage = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB max — Multer rejects anything bigger BEFORE it reaches Cloudinary
}).single("image");
