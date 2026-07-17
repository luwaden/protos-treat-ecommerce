import rateLimit from "express-rate-limit";
import { env } from "../config/env.js";

export const globalLimiter = rateLimit({
  windowMs: env.rateLimit.windowMs,
  max:      env.rateLimit.max,
  message:  { success: false, message: "Too many requests. Please try again later." },
  standardHeaders: true,
  legacyHeaders:   false,
});

export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max:      10,
  message:  { success: false, message: "Too many authentication attempts. Please wait 15 minutes." },
  standardHeaders: true,
  legacyHeaders:   false,
});

export const otpLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max:      5,
  message:  { success: false, message: "Too many OTP requests. Please wait 1 hour." },
  standardHeaders: true,
  legacyHeaders:   false,
});

export const paymentLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max:      20,
  message:  { success: false, message: "Too many payment requests. Please try again later." },
  standardHeaders: true,
  legacyHeaders:   false,
});