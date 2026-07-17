import type { Request, Response, NextFunction } from "express";
declare class ProductController {
    private clearProductCache;
    create: (req: Request, res: Response, next: NextFunction) => Promise<void>;
    update: (req: Request, res: Response, next: NextFunction) => Promise<void>;
    delete: (req: Request, res: Response, next: NextFunction) => Promise<void>;
    getAll: (req: Request, res: Response, next: NextFunction) => Promise<void>;
    getOne: (req: Request, res: Response, next: NextFunction) => Promise<void>;
    getCategories: (_req: Request, res: Response, next: NextFunction) => Promise<void>;
}
declare const _default: ProductController;
export default _default;
//# sourceMappingURL=product.controller.d.ts.map