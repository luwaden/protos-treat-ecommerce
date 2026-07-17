import type { RequestHandler } from "express";
export declare const validateRegister: RequestHandler;
export declare const validateLogin: RequestHandler;
export declare const validateForgotPassword: RequestHandler;
export declare const validateVerifyOtp: RequestHandler;
export declare const validateResetPassword: RequestHandler;
/**
 * `validateProduct` — used on POST /products (create).
 * All core fields are required for a brand-new product.
 */
export declare const validateProduct: RequestHandler;
/**
 * `validateProductUpdate` — used on PUT /products/:id.
 * Every field is optional (partial update), but whichever fields ARE
 * present must still be valid.
 */
export declare const validateProductUpdate: RequestHandler;
//# sourceMappingURL=validate.middleware.d.ts.map