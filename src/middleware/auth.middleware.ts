import type { Request, RequestHandler } from "express";
import type { JwtPayload } from "../types/index.js";
import { UserRole } from "../types/index.js";
import { verifyAccessToken } from "../utils/token.utils.js";

export interface AuthRequest extends Request {
  user?: JwtPayload;
}

/**
 * `protect` middleware
 * -------------------------------------------------------------------------
 * Guards routes that require a logged-in user.
 *
 * This middleware ONLY ever looks at the ACCESS TOKEN (sent via the
 * `Authorization: Bearer <token>` header). It never touches the refresh
 * token or Redis — that's intentional. Access token checks must be
 * fast and stateless, because they run on EVERY protected request.
 *
 * If the access token has expired, this middleware will reject the
 * request with 401. The frontend's job is to catch that 401, call
 * POST /api/auth/refresh to get a new access token, and retry the
 * original request.
 */
export const protect: RequestHandler = (req, res, next): void => {
  const authHeader = req.headers.authorization;

  if (!authHeader?.startsWith("Bearer ")) {
    res.status(401).json({ success: false, message: "Access denied. Please sign in." });
    return;
  }

  const token = authHeader.split(" ")[1]!;
  const decoded = verifyAccessToken(token);

  if (!decoded) {
    res.status(401).json({ success: false, message: "Session expired. Please sign in again." });
    return;
  }

  (req as AuthRequest).user = decoded;
  next();
};

/**
 * `authorize` middleware
 * -------------------------------------------------------------------------
 * Role-based access control (RBAC). This must run AFTER `protect`, because
 * it relies on `req.user` having already been set from a verified access
 * token.
 *
 * Usage:
 *   router.post("/", protect, authorize(UserRole.Admin), controller.create);
 *
 * This guards "who is allowed to do what" — e.g. only Admins may create,
 * update, or delete products, while any signed-in (or anonymous) visitor
 * may view them.
 */
export const authorize = (...allowedRoles: UserRole[]): RequestHandler => {
  return (req, res, next): void => {
    const user = (req as AuthRequest).user;

    if (!user) {
      res.status(401).json({ success: false, message: "Access denied. Please sign in." });
      return;
    }

    if (!allowedRoles.includes(user.role)) {
      res.status(403).json({
        success: false,
        message: "You do not have permission to perform this action.",
      });
      return;
    }

    next();
  };
};
