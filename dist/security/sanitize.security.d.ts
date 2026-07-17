import type { Request, Response, NextFunction } from "express";
export declare function sanitizeBody(req: Request, _res: Response, next: NextFunction): void;
export declare function validateEmail(email: unknown): boolean;
export declare function validatePassword(password: unknown): boolean;
//# sourceMappingURL=sanitize.security.d.ts.map