import { prisma } from "../lib/prisma.js";
import { UserRole, PaymentStatus, OrderStatus } from "@prisma/client";
import { tokenStore } from "../services/tokenStore.service.js";
import { orderService } from "../services/order.service.js";
import { cloudinaryService } from "../services/cloudinary.service.js";
import { AppError } from "../middleware/error.middleware.js";
import { sendResponse } from "../utils/response.utils.js";
/**
 * AdminController
 * -----------------------------------------------------------------------
 * EVERY method here assumes `protect` + `authorize(UserRole.Admin)` have
 * already run (see admin.routes.ts, which applies both to the whole
 * router in one line rather than repeating them on every route). No
 * method in this file needs to re-check "is this an admin?" itself —
 * that question has already been answered by the time these run.
 *
 * This is a SEPARATE controller from product.controller.ts /
 * payment.controller.ts on purpose: those two are also usable by
 * customers in some form (products are publicly readable; payments are
 * initiated by customers). Everything in THIS file has no reason to
 * exist for a non-admin, so it gets its own file, its own route prefix
 * (/api/admin/...), and — because of that prefix — its own obviously
 * separate section in the API surface.
 * -----------------------------------------------------------------------
 */
// A safe "shape" for sending user data to the frontend — deliberately
// leaves out `password`. Reused by every method below instead of typing
// this select block out repeatedly.
const SAFE_USER_SELECT = {
    id: true,
    name: true,
    email: true,
    role: true,
    isBanned: true,
    loginAttempts: true,
    lockUntil: true,
    createdAt: true,
};
class AdminController {
    // =========================================================================
    // GET /api/admin/dashboard — the numbers the dashboard's summary cards show
    // =========================================================================
    getDashboard = async (_req, res, next) => {
        try {
            const startOfToday = new Date();
            startOfToday.setHours(0, 0, 0, 0);
            const startOfMonth = new Date();
            startOfMonth.setDate(1);
            startOfMonth.setHours(0, 0, 0, 0);
            // Promise.all runs every one of these queries CONCURRENTLY instead
            // of one after another — for a read-only dashboard like this, none
            // of them depend on each other, so there's no reason to wait.
            const [totalUsers, totalAdmins, totalProducts, outOfStockCount, lowStockCount, totalOrders, ordersByStatusRaw, paidOrders, recentOrders, activeSessions,] = await Promise.all([
                prisma.user.count(),
                prisma.user.count({ where: { role: UserRole.Admin } }),
                prisma.product.count(),
                prisma.product.count({ where: { stock: { lte: 0 } } }),
                prisma.product.count({ where: { stock: { gt: 0, lte: 10 } } }),
                prisma.order.count(),
                prisma.order.groupBy({ by: ["orderStatus"], _count: { _all: true } }),
                // Every PAID order's amount + paidAt — small enough to reduce
                // in plain JavaScript below rather than a raw Mongo aggregation
                // pipeline, which keeps this code readable for a learning project.
                prisma.order.findMany({
                    where: { paymentStatus: PaymentStatus.Paid },
                    select: { totalAmount: true, paidAt: true },
                }),
                prisma.order.findMany({
                    take: 5,
                    orderBy: { createdAt: "desc" },
                    select: {
                        id: true,
                        totalAmount: true,
                        orderStatus: true,
                        paymentStatus: true,
                        createdAt: true,
                        user: { select: { name: true, email: true } },
                    },
                }),
                tokenStore.listActiveSessions(),
            ]);
            const ordersByStatus = Object.fromEntries(ordersByStatusRaw.map((row) => [row.orderStatus, row._count._all]));
            const totalRevenue = paidOrders.reduce((sum, o) => sum + o.totalAmount, 0);
            const todayRevenue = paidOrders
                .filter((o) => o.paidAt && o.paidAt >= startOfToday)
                .reduce((sum, o) => sum + o.totalAmount, 0);
            const monthRevenue = paidOrders
                .filter((o) => o.paidAt && o.paidAt >= startOfMonth)
                .reduce((sum, o) => sum + o.totalAmount, 0);
            const onlineUserCount = new Set(activeSessions.map((s) => s.userId)).size;
            sendResponse(res, 200, true, "Dashboard stats fetched.", {
                users: { total: totalUsers, admins: totalAdmins, customers: totalUsers - totalAdmins, onlineNow: onlineUserCount },
                products: { total: totalProducts, outOfStock: outOfStockCount, lowStock: lowStockCount },
                orders: { total: totalOrders, byStatus: ordersByStatus, recent: recentOrders },
                revenue: { allTime: totalRevenue, today: todayRevenue, thisMonth: monthRevenue },
            });
        }
        catch (err) {
            next(err);
        }
    };
    // =========================================================================
    // GET /api/admin/users — every registered user (Customers + Admins)
    // =========================================================================
    getUsers = async (_req, res, next) => {
        try {
            const users = await prisma.user.findMany({
                select: SAFE_USER_SELECT,
                orderBy: { createdAt: "desc" },
            });
            sendResponse(res, 200, true, "Users fetched.", users);
        }
        catch (err) {
            next(err);
        }
    };
    // =========================================================================
    // GET /api/admin/users/online — who's CURRENTLY logged in, right now
    // =========================================================================
    getOnlineUsers = async (_req, res, next) => {
        try {
            const sessions = await tokenStore.listActiveSessions();
            // One user can have multiple sessions (logged in on phone + laptop,
            // say) — group sessions by userId so the frontend gets one row per
            // person, with a device/session count.
            const sessionCountByUser = new Map();
            for (const s of sessions) {
                sessionCountByUser.set(s.userId, (sessionCountByUser.get(s.userId) ?? 0) + 1);
            }
            const userIds = [...sessionCountByUser.keys()];
            const users = await prisma.user.findMany({
                where: { id: { in: userIds } },
                select: SAFE_USER_SELECT,
            });
            const onlineUsers = users.map((u) => ({
                ...u,
                activeSessions: sessionCountByUser.get(u.id) ?? 0,
            }));
            sendResponse(res, 200, true, "Online users fetched.", onlineUsers);
        }
        catch (err) {
            next(err);
        }
    };
    // =========================================================================
    // GET /api/admin/users/:id — one user's profile + their order history
    // =========================================================================
    getUserById = async (req, res, next) => {
        try {
            const { id } = req.params;
            if (!id)
                throw new AppError("ID is required.", 400);
            const user = await prisma.user.findUnique({ where: { id }, select: SAFE_USER_SELECT });
            if (!user)
                throw new AppError("User not found.", 404);
            const orders = await prisma.order.findMany({
                where: { userId: id },
                orderBy: { createdAt: "desc" },
            });
            sendResponse(res, 200, true, "User fetched.", { user, orders });
        }
        catch (err) {
            next(err);
        }
    };
    // =========================================================================
    // PATCH /api/admin/users/:id/ban — toggle whether a user can log in
    // =========================================================================
    toggleUserBan = async (req, res, next) => {
        try {
            const { id } = req.params;
            if (!id)
                throw new AppError("ID is required.", 400);
            const actingAdminId = req.user.userId;
            if (id === actingAdminId)
                throw new AppError("You can't ban your own account.", 400);
            const target = await prisma.user.findUnique({ where: { id } });
            if (!target)
                throw new AppError("User not found.", 404);
            const updated = await prisma.user.update({
                where: { id },
                data: { isBanned: !target.isBanned },
                select: SAFE_USER_SELECT,
            });
            // Banning someone should also kick them out of any devices they're
            // currently signed in on — otherwise a banned user could keep using
            // an access token that's still valid for another few minutes, and
            // could silently refresh forever since nothing else checks isBanned.
            if (updated.isBanned) {
                await tokenStore.revokeAll(id);
            }
            sendResponse(res, 200, true, updated.isBanned ? "User has been banned." : "User has been unbanned.", updated);
        }
        catch (err) {
            next(err);
        }
    };
    // =========================================================================
    // PATCH /api/admin/users/:id/role — promote a Customer to Admin, or back
    // =========================================================================
    updateUserRole = async (req, res, next) => {
        try {
            const { id } = req.params;
            if (!id)
                throw new AppError("ID is required.", 400);
            const { role } = req.body;
            const actingAdminId = req.user.userId;
            if (id === actingAdminId)
                throw new AppError("You can't change your own role.", 400);
            if (!Object.values(UserRole).includes(role))
                throw new AppError("Invalid role.", 400);
            const target = await prisma.user.findUnique({ where: { id } });
            if (!target)
                throw new AppError("User not found.", 404);
            // Don't let the LAST admin demote themselves into having zero admins
            // left — that would lock everyone out of the admin dashboard for good
            // (remember: the public register form can never create an Admin).
            if (target.role === UserRole.Admin && role === UserRole.Customer) {
                const adminCount = await prisma.user.count({ where: { role: UserRole.Admin } });
                if (adminCount <= 1)
                    throw new AppError("Can't remove the last remaining Admin.", 400);
            }
            const updated = await prisma.user.update({ where: { id }, data: { role }, select: SAFE_USER_SELECT });
            sendResponse(res, 200, true, `Role updated to ${role}.`, updated);
        }
        catch (err) {
            next(err);
        }
    };
    // =========================================================================
    // GET /api/admin/orders — every order, across every customer
    // =========================================================================
    getOrders = async (req, res, next) => {
        try {
            const status = req.query.status;
            const where = status && status !== "All" ? { orderStatus: status } : {};
            const orders = await prisma.order.findMany({
                where,
                orderBy: { createdAt: "desc" },
                select: {
                    id: true,
                    items: true,
                    totalAmount: true,
                    paymentStatus: true,
                    orderStatus: true,
                    paidAt: true,
                    cancelledAt: true,
                    createdAt: true,
                    shippingAddress: true,
                    user: { select: { id: true, name: true, email: true } },
                },
            });
            sendResponse(res, 200, true, "Orders fetched.", orders);
        }
        catch (err) {
            next(err);
        }
    };
    // =========================================================================
    // GET /api/admin/orders/:id — a single order, full detail
    // =========================================================================
    getOrderById = async (req, res, next) => {
        try {
            const { id } = req.params;
            if (!id)
                throw new AppError("ID is required.", 400);
            const order = await prisma.order.findUnique({
                where: { id },
                include: { user: { select: { id: true, name: true, email: true } } },
            });
            if (!order)
                throw new AppError("Order not found.", 404);
            sendResponse(res, 200, true, "Order fetched.", order);
        }
        catch (err) {
            next(err);
        }
    };
    // =========================================================================
    // PATCH /api/admin/orders/:id/cancel — the "Cancel" button on the dashboard
    // =========================================================================
    cancelOrder = async (req, res, next) => {
        try {
            const { id } = req.params;
            if (!id)
                throw new AppError("Order ID is required.", 400);
            // All the actual business rules (can't cancel twice, refund if paid,
            // restock items) live in orderService — see order.service.ts. This
            // controller method's only job is to call it and shape the response.
            const { order, message } = await orderService.cancelOrder(id);
            sendResponse(res, 200, true, message, order);
        }
        catch (err) {
            next(err);
        }
    };
    // =========================================================================
    // PATCH /api/admin/orders/:id/status — move an order to Shipped/Delivered
    // =========================================================================
    updateOrderStatus = async (req, res, next) => {
        try {
            const { id } = req.params;
            if (!id)
                throw new AppError("ID is required.", 400);
            const { orderStatus } = req.body;
            if (!Object.values(OrderStatus).includes(orderStatus)) {
                throw new AppError("Invalid order status.", 400);
            }
            // Cancelling has its own dedicated endpoint (with refund/restock
            // logic) — this route is only for the "forward" progression.
            if (orderStatus === OrderStatus.Cancelled) {
                throw new AppError("Use PATCH /orders/:id/cancel to cancel an order.", 400);
            }
            const existing = await prisma.order.findUnique({ where: { id } });
            if (!existing)
                throw new AppError("Order not found.", 404);
            if (existing.orderStatus === OrderStatus.Cancelled) {
                throw new AppError("A cancelled order's status can't be changed.", 400);
            }
            const updated = await prisma.order.update({ where: { id }, data: { orderStatus } });
            sendResponse(res, 200, true, `Order marked as ${orderStatus}.`, updated);
        }
        catch (err) {
            next(err);
        }
    };
    // =========================================================================
    // GET /api/admin/revenue?period=daily|monthly — the chart on the dashboard
    // =========================================================================
    getRevenue = async (req, res, next) => {
        try {
            const period = req.query.period === "monthly" ? "monthly" : "daily";
            const paidOrders = await prisma.order.findMany({
                where: { paymentStatus: PaymentStatus.Paid, paidAt: { not: null } },
                select: { totalAmount: true, paidAt: true },
                orderBy: { paidAt: "asc" },
            });
            // Group revenue in plain JavaScript, keyed by "YYYY-MM-DD" (daily) or
            // "YYYY-MM" (monthly). This is simpler to read and debug than a
            // MongoDB aggregation pipeline, at the cost of pulling every paid
            // order into memory — completely fine at this project's scale; a
            // large production catalogue would eventually want to push this
            // grouping down into the database instead (see PROJECT_GUIDE.md's
            // "next exercises" for a pointer on how).
            const buckets = new Map();
            for (const order of paidOrders) {
                const d = order.paidAt;
                const key = period === "monthly"
                    ? `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`
                    : `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
                buckets.set(key, (buckets.get(key) ?? 0) + order.totalAmount);
            }
            const series = [...buckets.entries()]
                .sort(([a], [b]) => a.localeCompare(b))
                .map(([date, revenue]) => ({ date, revenue }));
            sendResponse(res, 200, true, "Revenue stats fetched.", { period, series });
        }
        catch (err) {
            next(err);
        }
    };
    // =========================================================================
    // POST /api/admin/upload/product-image — see IMAGE_UPLOAD_EXPLAINED.md
    // =========================================================================
    uploadProductImage = async (req, res, next) => {
        try {
            // By the time THIS code runs, the `uploadProductImage` multer
            // middleware (see upload.middleware.ts) has already: read the
            // incoming file, streamed it to Cloudinary, and attached the result
            // to `req.file`. There is no manual upload call here — multer did it.
            if (!req.file)
                throw new AppError("No image file was provided.", 400);
            sendResponse(res, 200, true, "Image uploaded.", {
                url: req.file.path, // the permanent Cloudinary URL — save this as the product's `image`
                publicId: req.file.filename, // Cloudinary's id for this asset — save this as `imagePublicId`
            });
        }
        catch (err) {
            next(err);
        }
    };
    // =========================================================================
    // DELETE /api/admin/upload/product-image — used if the admin cancels
    // out of the product form after uploading (avoids an orphaned image)
    // =========================================================================
    deleteUploadedImage = async (req, res, next) => {
        try {
            const { publicId } = req.body;
            if (!publicId)
                throw new AppError("publicId is required.", 400);
            await cloudinaryService.deleteImage(publicId);
            sendResponse(res, 200, true, "Image removed.");
        }
        catch (err) {
            next(err);
        }
    };
}
export default new AdminController();
//# sourceMappingURL=admin.controller.js.map