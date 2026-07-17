import type { JwtPayload, RefreshTokenPayload } from "../types/index.js";
export declare function signAccessToken(payload: JwtPayload): string;
export declare function verifyAccessToken(token: string): JwtPayload | null;
export declare function signRefreshToken(userId: string): {
    token: string;
    tokenId: string;
};
export declare function verifyRefreshToken(token: string): RefreshTokenPayload | null;
//# sourceMappingURL=token.utils.d.ts.map