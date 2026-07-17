import jwt from "jsonwebtoken";
import { randomUUID } from "crypto";
import { env } from "../config/env.js";
import type { JwtPayload, RefreshTokenPayload } from "../types/index.js";

export function signAccessToken(payload: JwtPayload): string {
  return jwt.sign(payload, env.accessTokenSecret, {
    expiresIn: env.accessTokenExpiresIn,
  });
}

export function verifyAccessToken(token: string): JwtPayload | null {
  try {
    return jwt.verify(token, env.accessTokenSecret) as JwtPayload;
  } catch {
    return null;
  }
}


export function signRefreshToken(userId: string): { token: string; tokenId: string } {
  const tokenId = randomUUID();

  const payload: RefreshTokenPayload = { userId, tokenId };

  const token = jwt.sign(payload, env.refreshTokenSecret, {
    expiresIn: env.refreshTokenExpiresIn,
  });

  return { token, tokenId };
}

export function verifyRefreshToken(token: string): RefreshTokenPayload | null {
  try {
    return jwt.verify(token, env.refreshTokenSecret) as RefreshTokenPayload;
  } catch {
    return null;
  }
}
