import jwt from "jsonwebtoken";
import { randomUUID } from "crypto";
import { env } from "../config/env.js";
export function signAccessToken(payload) {
    return jwt.sign(payload, env.accessTokenSecret, {
        expiresIn: env.accessTokenExpiresIn,
    });
}
export function verifyAccessToken(token) {
    try {
        return jwt.verify(token, env.accessTokenSecret);
    }
    catch {
        return null;
    }
}
export function signRefreshToken(userId) {
    const tokenId = randomUUID();
    const payload = { userId, tokenId };
    const token = jwt.sign(payload, env.refreshTokenSecret, {
        expiresIn: env.refreshTokenExpiresIn,
    });
    return { token, tokenId };
}
export function verifyRefreshToken(token) {
    try {
        return jwt.verify(token, env.refreshTokenSecret);
    }
    catch {
        return null;
    }
}
//# sourceMappingURL=token.utils.js.map