import type { Request, Response, NextFunction } from "express";
import bcrypt from "bcryptjs";
import { prisma } from "../lib/prisma.js";
import { userService } from "../services/user.service.js";
import { tokenStore } from "../services/tokenStore.service.js";
import emailService from "../services/email.service.js";
import type { AuthRequest } from "../middleware/auth.middleware.js";
import { AppError } from "../middleware/error.middleware.js";
import {
  signAccessToken,
  signRefreshToken,
  verifyRefreshToken,
} from "../utils/token.utils.js";
import {
  setRefreshTokenCookie,
  clearRefreshTokenCookie,
  REFRESH_COOKIE_NAME,
} from "../utils/cookie.utils.js";
import { generateOtp, generateResetToken } from "../utils/otp.utils.js";
import { toPublicUser } from "../utils/user.utils.js";
import { sendResponse } from "../utils/response.utils.js";
import { env } from "../config/env.js";
import type { JwtPayload } from "../types/index.js";

/**
 * Issues a brand-new access + refresh token PAIR for a user.
 *
 * - The access token is returned as a string (caller puts it in the
 *   JSON response body).
 * - The refresh token is NOT returned directly — it is saved straight
 *   into an httpOnly cookie on `res`, and its tokenId is recorded in
 *   Redis so it can be revoked later.
 *
 * Centralizing this in one helper means register, login, refresh, and
 * resetPassword all issue tokens in EXACTLY the same way — one less
 * place for bugs to creep in.
 */
async function issueTokenPair(payload: JwtPayload, res: Response): Promise<string> {
  const accessToken = signAccessToken(payload);

  const { token: refreshToken, tokenId } = signRefreshToken(payload.userId);
  await tokenStore.save(payload.userId, tokenId);

  setRefreshTokenCookie(res, refreshToken);

  return accessToken;
}

class AuthController {
  /**
   * POST /api/auth/register
   */
  register = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { name, email, password } = req.body;

      const existing = await userService.findByEmail(email);
      if (existing) throw new AppError("An account with this email already exists.", 409);

      const user = await userService.create({ name, email, password });

      const payload: JwtPayload = { userId: user.id, email: user.email, role: user.role };
      const accessToken = await issueTokenPair(payload, res);

      emailService.sendWelcome(user.email, user.name).catch(console.error);

      sendResponse(res, 201, true, "Account created successfully.", {
        accessToken,
        user: toPublicUser(user),
      });
    } catch (err) { next(err); }
  };

  /**
   * POST /api/auth/login
   */
  login = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { email, password } = req.body;

      const user = await userService.findByEmail(email);
      if (!user) throw new AppError("Incorrect email or password.", 401);

      // A banned user shouldn't even get as far as a password check —
      // this is set by an Admin via PATCH /api/admin/users/:id/ban.
      if (user.isBanned) {
        throw new AppError("This account has been suspended. Please contact support.", 403);
      }

      if (userService.isLocked(user)) {
        throw new AppError("Account is temporarily locked. Please try again in 30 minutes.", 403);
      }

      const match = await userService.comparePassword(password, user.password);
      if (!match) {
        await userService.incrementLoginAttempts(user);
        throw new AppError("Incorrect email or password.", 401);
      }

      await userService.resetLoginAttempts(user.id);

      const payload: JwtPayload = { userId: user.id, email: user.email, role: user.role };
      const accessToken = await issueTokenPair(payload, res);

      sendResponse(res, 200, true, "Login successful.", {
        accessToken,
        user: toPublicUser(user),
      });
    } catch (err) { next(err); }
  };

  /**
   * POST /api/auth/refresh
   *
   * Reads the refresh token from the httpOnly cookie, validates it,
   * and — if everything checks out — issues a brand new access +
   * refresh token pair (rotation).
   */
  refresh = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const token = req.cookies?.[REFRESH_COOKIE_NAME] as string | undefined;

      if (!token) {
        throw new AppError("No refresh token provided. Please sign in.", 401);
      }

      // Step 1: Is the JWT itself valid (correct signature, not expired)?
      const decoded = verifyRefreshToken(token);
      if (!decoded) {
        clearRefreshTokenCookie(res);
        throw new AppError("Invalid refresh token. Please sign in again.", 401);
      }

      // Step 2: Is this specific token still "allowed" according to Redis?
      // (It might have already been used once, or the user logged out.)
      const isValid = await tokenStore.exists(decoded.userId, decoded.tokenId);
      if (!isValid) {
        clearRefreshTokenCookie(res);
        throw new AppError("Session expired or revoked. Please sign in again.", 401);
      }

      // Step 3: ROTATION — immediately revoke the token that was just used.
      // A refresh token can only ever be used ONCE. If we ever see the
      // SAME tokenId presented again later, we know it's a replay/theft
      // attempt (because step 2 above would now fail for it).
      await tokenStore.revoke(decoded.userId, decoded.tokenId);

      const user = await userService.findById(decoded.userId);
      if (!user) {
        clearRefreshTokenCookie(res);
        throw new AppError("User no longer exists.", 401);
      }

      const payload: JwtPayload = { userId: user.id, email: user.email, role: user.role };
      const accessToken = await issueTokenPair(payload, res);

      sendResponse(res, 200, true, "Token refreshed successfully.", { accessToken });
    } catch (err) { next(err); }
  };

  /**
   * POST /api/auth/logout
   *
   * Revokes the CURRENT refresh token (so it can't be used to mint new
   * access tokens anymore) and clears the cookie from the browser.
   */
  logout = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const token = req.cookies?.[REFRESH_COOKIE_NAME] as string | undefined;

      if (token) {
        const decoded = verifyRefreshToken(token);
        if (decoded) {
          await tokenStore.revoke(decoded.userId, decoded.tokenId);
        }
      }

      clearRefreshTokenCookie(res);
      sendResponse(res, 200, true, "Logged out successfully.");
    } catch (err) { next(err); }
  };

  /**
   * POST /api/auth/logout-all  (protected route)
   *
   * Revokes EVERY refresh token belonging to this user — useful for a
   * "log out of all devices" button, or after the user suspects their
   * account was compromised.
   */
  logoutAll = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { userId } = (req as AuthRequest).user!;
      await tokenStore.revokeAll(userId);
      clearRefreshTokenCookie(res);
      sendResponse(res, 200, true, "Logged out from all devices.");
    } catch (err) { next(err); }
  };

  /**
   * GET /api/auth/me  (protected route)
   */
  getMe = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { userId } = (req as AuthRequest).user!;
      const user = await userService.findById(userId);
      if (!user) throw new AppError("User not found.", 404);
      sendResponse(res, 200, true, "User retrieved.", { user: toPublicUser(user) });
    } catch (err) { next(err); }
  };

  /**
   * POST /api/auth/forgot-password
   */
  forgotPassword = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const email = req.body.email.toLowerCase();
      const user = await userService.findByEmail(email);

      // Note: we ALWAYS return the same success message, whether or not
      // the email exists. This prevents attackers from using this endpoint
      // to discover which emails are registered ("email enumeration").
      if (user) {
        await prisma.passwordReset.deleteMany({ where: { email } });

        const otp = generateOtp();
        const otpHash = await bcrypt.hash(otp, env.bcryptSaltRounds);
        const expiresAt = new Date(Date.now() + env.otpExpiryMinutes * 60 * 1000);

        await prisma.passwordReset.create({
          data: { email, otpHash, expiresAt, used: false },
        });

        await emailService.sendOtp(email, otp);
      }

      sendResponse(res, 200, true, "If that email is registered, a reset code has been sent.");
    } catch (err) { next(err); }
  };

  /**
   * POST /api/auth/verify-otp
   */
  verifyOtp = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { email, otp } = req.body;

      const record = await prisma.passwordReset.findFirst({
        where: {
          email: email.toLowerCase(),
          used: false,
          expiresAt: { gt: new Date() },
        },
      });

      if (!record) throw new AppError("Invalid or expired code. Please request a new one.", 400);

      const match = await bcrypt.compare(otp, record.otpHash);
      if (!match) throw new AppError("Invalid code. Please check and try again.", 400);

      const resetToken = generateResetToken();

      await prisma.passwordReset.update({
        where: { id: record.id },
        data: { resetToken },
      });

      sendResponse(res, 200, true, "Code verified.", { resetToken });
    } catch (err) { next(err); }
  };

  /**
   * POST /api/auth/reset-password
   */
  resetPassword = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { resetToken, newPassword } = req.body;

      const record = await prisma.passwordReset.findFirst({
        where: {
          resetToken,
          used: false,
          expiresAt: { gt: new Date() },
        },
      });

      if (!record) throw new AppError("Invalid or expired reset link. Please start again.", 400);

      const user = await userService.findByEmail(record.email);
      if (!user) throw new AppError("User not found.", 404);

      await userService.updatePassword(user.id, newPassword);

      await prisma.passwordReset.update({
        where: { id: record.id },
        data: { used: true },
      });

      // Security: a password reset means we should NOT trust any
      // refresh tokens issued before this point (e.g. a stolen token
      // from before the user secured their account).
      await tokenStore.revokeAll(user.id);

      const payload: JwtPayload = { userId: user.id, email: user.email, role: user.role };
      const accessToken = await issueTokenPair(payload, res);

      sendResponse(res, 200, true, "Password updated successfully.", {
        accessToken,
        user: toPublicUser(user),
      });
    } catch (err) { next(err); }
  };
}

export default new AuthController();
