import { Router } from "express";
import authController from "../controllers/auth.controller.js";
import { protect } from "../middleware/auth.middleware.js";
import { authLimiter, otpLimiter } from "../security/rateLimiter.security.js";
import { sanitizeBody } from "../security/sanitize.security.js";
import {
  validateRegister,
  validateLogin,
  validateForgotPassword,
  validateVerifyOtp,
  validateResetPassword,
} from "../middleware/validate.middleware.js";

const router = Router();

router.use(sanitizeBody);

router.post("/register",        authLimiter, validateRegister,        authController.register);
router.post("/login",           authLimiter, validateLogin,           authController.login);
router.post("/refresh",                                               authController.refresh);
router.post("/logout",                                                authController.logout);
router.post("/forgot-password", otpLimiter,  validateForgotPassword,  authController.forgotPassword);
router.post("/verify-otp",      otpLimiter,  validateVerifyOtp,       authController.verifyOtp);
router.post("/reset-password",               validateResetPassword,   authController.resetPassword);
router.get("/me",               protect,                              authController.getMe);
router.post("/logout-all", protect, authController.logoutAll);

export default router;