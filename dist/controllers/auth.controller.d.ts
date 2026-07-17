import type { Request, Response, NextFunction } from "express";
declare class AuthController {
    /**
     * POST /api/auth/register
     */
    register: (req: Request, res: Response, next: NextFunction) => Promise<void>;
    /**
     * POST /api/auth/login
     */
    login: (req: Request, res: Response, next: NextFunction) => Promise<void>;
    /**
     * POST /api/auth/refresh
     *
     * Reads the refresh token from the httpOnly cookie, validates it,
     * and — if everything checks out — issues a brand new access +
     * refresh token pair (rotation).
     */
    refresh: (req: Request, res: Response, next: NextFunction) => Promise<void>;
    /**
     * POST /api/auth/logout
     *
     * Revokes the CURRENT refresh token (so it can't be used to mint new
     * access tokens anymore) and clears the cookie from the browser.
     */
    logout: (req: Request, res: Response, next: NextFunction) => Promise<void>;
    /**
     * POST /api/auth/logout-all  (protected route)
     *
     * Revokes EVERY refresh token belonging to this user — useful for a
     * "log out of all devices" button, or after the user suspects their
     * account was compromised.
     */
    logoutAll: (req: Request, res: Response, next: NextFunction) => Promise<void>;
    /**
     * GET /api/auth/me  (protected route)
     */
    getMe: (req: Request, res: Response, next: NextFunction) => Promise<void>;
    /**
     * POST /api/auth/forgot-password
     */
    forgotPassword: (req: Request, res: Response, next: NextFunction) => Promise<void>;
    /**
     * POST /api/auth/verify-otp
     */
    verifyOtp: (req: Request, res: Response, next: NextFunction) => Promise<void>;
    /**
     * POST /api/auth/reset-password
     */
    resetPassword: (req: Request, res: Response, next: NextFunction) => Promise<void>;
}
declare const _default: AuthController;
export default _default;
//# sourceMappingURL=auth.controller.d.ts.map