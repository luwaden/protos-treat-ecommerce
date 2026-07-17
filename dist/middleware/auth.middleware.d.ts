import type { Request, RequestHandler } from "express";
import type { JwtPayload } from "../types/index.js";
import { UserRole } from "../types/index.js";
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
export declare const protect: RequestHandler;
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
export declare const authorize: (...allowedRoles: UserRole[]) => RequestHandler;
//# sourceMappingURL=auth.middleware.d.ts.map