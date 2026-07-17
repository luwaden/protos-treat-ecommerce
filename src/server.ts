import "dotenv/config";
import express from "express";
import type  { Application, Request, Response } from "express";
import cors from "cors";
import compression from "compression";
import mongoSanitize from "express-mongo-sanitize";
import morgan from "morgan";


import { env } from "./config/env.js";
import { corsOptions } from "./config/cors.js";
import { errorHandler } from "./middleware/error.middleware.js";
import { globalLimiter } from "./security/rateLimiter.security.js";
import { helmetConfig } from "./security/helmet.security.js";
import { connectRedis } from "./config/redis.js"; 
import authRoutes    from "./routes/auth.routes.js";
import productRoutes from "./routes/product.routes.js";
import paymentRoutes from "./routes/payment.routes.js";
import adminRoutes   from "./routes/admin.routes.js";

const app: Application = express();

app.use(helmetConfig);
app.use(cors(corsOptions));
app.use(compression());
app.use(morgan("dev"));
app.use(express.json({ limit: "10kb" }));
app.use(express.urlencoded({ extended: true, limit: "10kb" }));
app.use(mongoSanitize());
app.use(globalLimiter);

app.get("/", (_req: Request, res: Response) => {
  res.json({
    success: true,
    message: "Protos Treat API v1.0 🌿",
    environment: env.nodeEnv,
    endpoints: [
      "GET    /",
      "POST   /auth/register",
      "POST   /auth/login",
      "POST   /auth/refresh",
      "POST   /auth/logout",
      "GET    /auth/me",
      "POST   /auth/forgot-password",
      "POST   /auth/verify-otp",
      "POST   /auth/reset-password",
      "GET     /products",
      "POST    /products",            
      "GET     /products/categories",
      "GET     /products/:id",
      "PUT     /products/:id",         
      "DELETE  /products/:id",
      "POST   /payments/initiate",
      "GET    /payments/verify/:reference",
      "POST   /payments/webhook",
      "GET    /admin/dashboard",
      "GET    /admin/users",
      "GET    /admin/users/online",
      "GET    /admin/users/:id",
      "PATCH  /admin/users/:id/ban",
      "PATCH  /admin/users/:id/role",
      "GET    /admin/orders",
      "GET    /admin/orders/:id",
      "PATCH  /admin/orders/:id/cancel",
      "PATCH  /admin/orders/:id/status",
      "GET    /admin/revenue",
      "POST   /admin/upload/product-image",
      "DELETE /admin/upload/product-image",
    ],
  });
});

app.use("/api/auth",     authRoutes);
app.use("/api/products", productRoutes);
app.use("/api/payments", paymentRoutes);
app.use("/api/admin",    adminRoutes);

app.use((_req: Request, res: Response) => {
  res.status(404).json({ success: false, message: "Route not found." });
});

app.use(errorHandler);
async function bootstrap(): Promise<void> {
  try {
    // 1. CONNECT TO REDIS BEFORE THE SERVER STARTS LISTENING
    // (Prisma connects to MongoDB lazily, on its first query — see
    // src/lib/prisma.ts — so there's no separate "connect" step for it here.)
    await connectRedis();

    // 2. START THE EXPRESS SERVER
    app.listen(env.port, () => {
      console.log(`\n🚀  Protos Treat API running on http://localhost:${env.port}`);
      console.log(`🌍  Environment : ${env.nodeEnv}`);
    });
  } catch (err) {
    console.error("❌  Initialization failed during bootstrap:", err);
    process.exit(1);
  }
}

bootstrap().catch((err) => {
  console.error("❌  Failed to start:", err);
  process.exit(1);
});