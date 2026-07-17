import { Router } from "express";
import adminController from "../controllers/admin.controller.js";
import { protect, authorize } from "../middleware/auth.middleware.js";
import { uploadProductImage } from "../middleware/upload.middleware.js";
import { sanitizeBody } from "../security/sanitize.security.js";
import { UserRole } from "../types/index.js";
const router = Router();
// --------------------------------------------------------------------------
// EVERYTHING in this file is Admin-only. Rather than repeating
// `protect, authorize(UserRole.Admin)` on every single route below (like
// product.routes.ts does, because that file mixes public + admin routes),
// we apply both middlewares ONCE, to the whole router, with `router.use`.
// Every request that reaches ANY route below has already been confirmed
// to be a logged-in Admin — no route handler needs to check again.
// --------------------------------------------------------------------------
router.use(protect, authorize(UserRole.Admin));
// Dashboard summary (users/products/orders/revenue counts in one call)
router.get("/dashboard", adminController.getDashboard);
// Users
router.get("/users", adminController.getUsers);
router.get("/users/online", adminController.getOnlineUsers); // must come before /users/:id
router.get("/users/:id", adminController.getUserById);
router.patch("/users/:id/ban", adminController.toggleUserBan);
router.patch("/users/:id/role", sanitizeBody, adminController.updateUserRole);
// Orders
router.get("/orders", adminController.getOrders);
router.get("/orders/:id", adminController.getOrderById);
router.patch("/orders/:id/cancel", adminController.cancelOrder);
router.patch("/orders/:id/status", sanitizeBody, adminController.updateOrderStatus);
// Revenue analytics
router.get("/revenue", adminController.getRevenue);
// Image upload (Multer -> Cloudinary). See IMAGE_UPLOAD_EXPLAINED.md for
// the full request-by-request walkthrough of what happens here.
router.post("/upload/product-image", uploadProductImage, adminController.uploadProductImage);
router.delete("/upload/product-image", sanitizeBody, adminController.deleteUploadedImage);
export default router;
//# sourceMappingURL=admin.routes.js.map