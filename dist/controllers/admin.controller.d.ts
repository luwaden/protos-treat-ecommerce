import type { Request, Response, NextFunction } from "express";
declare class AdminController {
    getDashboard: (_req: Request, res: Response, next: NextFunction) => Promise<void>;
    getUsers: (_req: Request, res: Response, next: NextFunction) => Promise<void>;
    getOnlineUsers: (_req: Request, res: Response, next: NextFunction) => Promise<void>;
    getUserById: (req: Request, res: Response, next: NextFunction) => Promise<void>;
    toggleUserBan: (req: Request, res: Response, next: NextFunction) => Promise<void>;
    updateUserRole: (req: Request, res: Response, next: NextFunction) => Promise<void>;
    getOrders: (req: Request, res: Response, next: NextFunction) => Promise<void>;
    getOrderById: (req: Request, res: Response, next: NextFunction) => Promise<void>;
    cancelOrder: (req: Request, res: Response, next: NextFunction) => Promise<void>;
    updateOrderStatus: (req: Request, res: Response, next: NextFunction) => Promise<void>;
    getRevenue: (req: Request, res: Response, next: NextFunction) => Promise<void>;
    uploadProductImage: (req: Request, res: Response, next: NextFunction) => Promise<void>;
    deleteUploadedImage: (req: Request, res: Response, next: NextFunction) => Promise<void>;
}
declare const _default: AdminController;
export default _default;
//# sourceMappingURL=admin.controller.d.ts.map