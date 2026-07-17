import { prisma } from "../lib/prisma.js";
import { redisClient } from "../config/redis.js"; // Using your exact export name
import { AppError } from "../middleware/error.middleware.js";
import { sendResponse } from "../utils/response.utils.js";
import { cloudinaryService } from "../services/cloudinary.service.js";
const CACHE_TTL = 3600; // 1 hour
class ProductController {
    // Helper to clear product caches using node-redis commands
    async clearProductCache() {
        try {
            // Node-redis uses .keys() and .del()
            const keys = await redisClient.keys("products:*");
            if (keys.length > 0) {
                await redisClient.del(keys);
            }
        }
        catch (err) {
            console.error("Redis cache invalidation failed:", err);
        }
    }
    // ==========================================
    // CREATE: Create New Product
    // ==========================================
    create = async (req, res, next) => {
        try {
            const { name, description, price, category, image, imagePublicId, stock } = req.body;
            const computedStock = Number(stock) || 0;
            const newProduct = await prisma.product.create({
                data: {
                    name,
                    description,
                    price: Number(price),
                    category,
                    image,
                    imagePublicId: imagePublicId || null,
                    stock: computedStock,
                    inStock: computedStock > 0,
                },
            });
            await this.clearProductCache();
            sendResponse(res, 201, true, "Product created successfully", newProduct);
        }
        catch (err) {
            next(err);
        }
    };
    // ==========================================
    // UPDATE: Modify Product Fields
    // ==========================================
    update = async (req, res, next) => {
        try {
            const { id } = req.params;
            if (!id)
                throw new AppError("Product ID is required", 400);
            const { name, description, price, category, image, imagePublicId, stock } = req.body;
            const existing = await prisma.product.findUnique({ where: { id: String(id) } });
            if (!existing)
                throw new AppError("Product not found", 404);
            const updateData = {};
            if (name !== undefined)
                updateData.name = name;
            if (description !== undefined)
                updateData.description = description;
            if (price !== undefined)
                updateData.price = Number(price);
            if (category !== undefined)
                updateData.category = category;
            // If a NEW image was uploaded (new imagePublicId provided, different
            // from the one already stored), swap it in — and delete the OLD
            // Cloudinary asset so it doesn't sit around unused forever.
            if (image !== undefined && imagePublicId !== undefined && imagePublicId !== existing.imagePublicId) {
                updateData.image = image;
                updateData.imagePublicId = imagePublicId;
                await cloudinaryService.deleteImage(existing.imagePublicId);
            }
            else if (image !== undefined) {
                // Admin pasted a plain URL with no matching public_id (rare, but
                // don't block it) — just update the URL, leave imagePublicId as is.
                updateData.image = image;
            }
            if (stock !== undefined) {
                const s = Number(stock);
                updateData.stock = s;
                updateData.inStock = s > 0;
            }
            // MongoDB unique lookup via strictly-typed ID string
            const updatedProduct = await prisma.product.update({
                where: { id: String(id) },
                data: updateData,
            });
            await this.clearProductCache();
            sendResponse(res, 200, true, "Product updated successfully", updatedProduct);
        }
        catch (err) {
            next(err);
        }
    };
    // ==========================================
    // DELETE: Remove Product
    // ==========================================
    delete = async (req, res, next) => {
        try {
            const { id } = req.params;
            if (!id)
                throw new AppError("Product ID is required", 400);
            const existing = await prisma.product.findUnique({ where: { id: String(id) } });
            if (!existing)
                throw new AppError("Product not found", 404);
            await prisma.product.delete({
                where: { id: String(id) },
            });
            // Clean up the image in Cloudinary too — otherwise it stays there
            // forever, unused, slowly eating into your Cloudinary storage quota.
            await cloudinaryService.deleteImage(existing.imagePublicId);
            await this.clearProductCache();
            sendResponse(res, 200, true, "Product deleted successfully", { id });
        }
        catch (err) {
            next(err);
        }
    };
    // ==========================================
    // GET ALL: Fetch Products (Native MongoDB Filter matching)
    // ==========================================
    getAll = async (req, res, next) => {
        try {
            const search = req.query.search;
            const category = req.query.category;
            const cacheKey = `products:all:search=${search || ""}:cat=${category || ""}`;
            const cachedProducts = await redisClient.get(cacheKey);
            if (cachedProducts) {
                sendResponse(res, 200, true, "Products fetched successfully (cached)", JSON.parse(cachedProducts));
                return; // Fixed: Simply return; don't return the sendResponse call
            }
            // MongoDB clean filter mapping object
            const filterConditions = {};
            if (search) {
                filterConditions.name = {
                    contains: search,
                    mode: "insensitive",
                };
            }
            if (category && category !== "All") {
                filterConditions.category = category;
            }
            const products = await prisma.product.findMany({
                where: filterConditions,
            });
            const responseData = {
                count: products.length,
                data: products,
            };
            // node-redis syntax uses options object for EX (expire)
            await redisClient.set(cacheKey, JSON.stringify(responseData), {
                EX: CACHE_TTL,
            });
            sendResponse(res, 200, true, "Products fetched successfully", responseData);
        }
        catch (err) {
            next(err);
        }
    };
    // ==========================================
    // GET ONE: Fetch Single Product
    // ==========================================
    getOne = async (req, res, next) => {
        try {
            const { id } = req.params;
            if (!id)
                throw new AppError("Product ID is required", 400);
            const cacheKey = `products:single:${id}`;
            const cachedProduct = await redisClient.get(cacheKey);
            if (cachedProduct) {
                sendResponse(res, 200, true, "Product found (cached)", JSON.parse(cachedProduct));
                return;
            }
            const product = await prisma.product.findUnique({
                where: { id: String(id) },
            });
            if (!product)
                throw new AppError("Product not found", 404);
            await redisClient.set(cacheKey, JSON.stringify(product), {
                EX: CACHE_TTL,
            });
            sendResponse(res, 200, true, "Product found", product);
        }
        catch (err) {
            next(err);
        }
    };
    // ==========================================
    // GET CATEGORIES: Distinct List
    // ==========================================
    getCategories = async (_req, res, next) => {
        try {
            const cacheKey = "products:categories";
            const cachedCategories = await redisClient.get(cacheKey);
            if (cachedCategories) {
                sendResponse(res, 200, true, "Categories fetched successfully (cached)", JSON.parse(cachedCategories));
                return;
            }
            const categories = await prisma.product.findMany({
                select: { category: true },
                distinct: ["category"],
            });
            const list = ["All", ...categories.map((c) => c.category)];
            await redisClient.set(cacheKey, JSON.stringify(list), {
                EX: CACHE_TTL,
            });
            sendResponse(res, 200, true, "Categories fetched successfully", list);
        }
        catch (err) {
            next(err);
        }
    };
}
export default new ProductController();
//# sourceMappingURL=product.controller.js.map