import { Router } from "express";
import paymentController from "../controllers/payment.controller.js";
import { protect } from "../middleware/auth.middleware.js";
import { paymentLimiter } from "../security/rateLimiter.security.js";
const router = Router();
router.post("/initiate", protect, paymentLimiter, paymentController.initiate);
router.get("/verify/:reference", protect, paymentController.verify);
router.post("/webhook", paymentController.webhook);
export default router;
//# sourceMappingURL=payment.routes.js.map