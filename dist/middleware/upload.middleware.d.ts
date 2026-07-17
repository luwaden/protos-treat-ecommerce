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
export declare const uploadProductImage: import("express").RequestHandler<import("express-serve-static-core").ParamsDictionary, any, any, import("qs").ParsedQs, Record<string, any>>;
//# sourceMappingURL=upload.middleware.d.ts.map