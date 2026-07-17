import type { Request, Response, NextFunction } from "express";
/**
 * PaymentController
 * -----------------------------------------------------------------------
 * Everything here reads and writes the `Order` model through **Prisma** —
 * the same client used everywhere else in this project (auth, products).
 * There is no separate database driver for orders anymore.
 * -----------------------------------------------------------------------
 */
declare class PaymentController {
    initiate: (req: Request, res: Response, next: NextFunction) => Promise<void>;
    verify: (req: Request, res: Response, next: NextFunction) => Promise<void>;
    webhook: (req: Request, res: Response, _next: NextFunction) => Promise<void>;
}
declare const _default: PaymentController;
export default _default;
//# sourceMappingURL=payment.controller.d.ts.map