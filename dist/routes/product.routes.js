import { Router } from "express";
import productController from "../controllers/product.controller.js";
import { protect, authorize } from "../middleware/auth.middleware.js";
import { sanitizeBody } from "../security/sanitize.security.js";
import { validateProduct, validateProductUpdate } from "../middleware/validate.middleware.js";
import { UserRole } from "../types/index.js";
const router = Router();
// --------------------------------------------------------------------------
// PUBLIC routes — anyone (including guests) can browse the catalogue.
// --------------------------------------------------------------------------
router.get("/", productController.getAll);
router.get("/categories", productController.getCategories);
router.get("/:id", productController.getOne);
// --------------------------------------------------------------------------
// ADMIN-ONLY routes — must be signed in AND have role = Admin.
// `protect`   -> verifies the access token, attaches req.user
// `authorize` -> checks req.user.role is allowed to proceed
// `sanitizeBody` strips/escapes any stray HTML from text fields.
// --------------------------------------------------------------------------
router.post("/", protect, authorize(UserRole.Admin), sanitizeBody, validateProduct, productController.create);
router.put("/:id", protect, authorize(UserRole.Admin), sanitizeBody, validateProductUpdate, productController.update);
router.delete("/:id", protect, authorize(UserRole.Admin), productController.delete);
export default router;
//# sourceMappingURL=product.routes.js.map