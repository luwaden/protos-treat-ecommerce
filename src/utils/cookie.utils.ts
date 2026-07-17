import type { Response } from "express";
import { env } from "../config/env.js";
import { expiryToSeconds } from "./time.utils.js";

/**
 * Name of the cookie that holds the refresh token.
 * Exported so the controller can read `req.cookies[REFRESH_COOKIE_NAME]`.
 */
export const REFRESH_COOKIE_NAME = "refreshToken";

/**
 * Attaches the refresh token to the response as an httpOnly cookie.
 *
 * Cookie flags explained (each one matters!):
 * - httpOnly: true   -> JavaScript (document.cookie) CANNOT read this cookie.
 *                       This is your main defence against XSS attacks
 *                       stealing the refresh token.
 * - secure: !isDev   -> In production, the cookie is ONLY sent over HTTPS.
 *                       In local development (http://localhost) we relax this,
 *                       otherwise the cookie would never be sent at all.
 * - sameSite: "strict" -> The cookie is only sent for requests that originate
 *                       from your own site. This is your main defence against
 *                       CSRF (Cross-Site Request Forgery).
 * - path: "/api/auth"  -> The browser will only attach this cookie when
 *                       calling auth endpoints (refresh/logout), not on
 *                       every single request to your API. Smaller "blast
 *                       radius" if something goes wrong.
 * - maxAge            -> How long the browser should keep the cookie,
 *                       in MILLISECONDS (note: different unit from JWT!).
 */
export function setRefreshTokenCookie(res: Response, token: string): void {
  const maxAgeMs = expiryToSeconds(env.refreshTokenExpiresIn) * 1000;

  res.cookie(REFRESH_COOKIE_NAME, token, {
    httpOnly: true,
    secure: !env.isDev,
    sameSite: "strict",
    maxAge: maxAgeMs,
    path: "/api/auth",
  });
}

/**
 * Removes the refresh token cookie from the browser.
 * The options passed here MUST match the ones used when the cookie
 * was set (especially `path`), or the browser won't find it to delete it.
 */
export function clearRefreshTokenCookie(res: Response): void {
  res.clearCookie(REFRESH_COOKIE_NAME, {
    httpOnly: true,
    secure: !env.isDev,
    sameSite: "strict",
    path: "/api/auth",
  });
}
