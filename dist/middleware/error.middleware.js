import { env } from "../config/env.js";
export class AppError extends Error {
    statusCode;
    constructor(message, statusCode) {
        super(message);
        this.statusCode = statusCode;
        this.name = "AppError";
    }
}
export function errorHandler(err, req, res, _next) {
    let statusCode = 500;
    let message = "Something went wrong. Please try again.";
    if (err instanceof AppError) {
        statusCode = err.statusCode;
        message = err.message;
    }
    else if (err.name === "MulterError") {
        // Thrown by the image-upload middleware (see upload.middleware.ts) —
        // e.g. the file was bigger than the 5MB limit, or the field name in
        // the form-data didn't match what multer expected ("image").
        statusCode = 400;
        message = err.code === "LIMIT_FILE_SIZE"
            ? "Image is too large — please upload a file under 5MB."
            : `Upload error: ${err.message}`;
    }
    else if (err.code === "P2002") {
        // Prisma: unique constraint violation (e.g. duplicate email, or a
        // duplicate Paystack payment reference).
        statusCode = 409;
        message = "A record with that value already exists.";
    }
    else if (err.code === "P2025") {
        // Prisma: "record to update/delete does not exist".
        statusCode = 404;
        message = "The requested record was not found.";
    }
    else if (err.code === "11000") {
        statusCode = 409;
        message = "An account with this email already exists.";
    }
    else if (err.name === "ValidationError") {
        statusCode = 400;
        message = err.message;
    }
    else if (err.name === "CastError") {
        statusCode = 400;
        message = "Invalid ID format.";
    }
    if (env.isDev)
        console.error("❌ Error:", err);
    res.status(statusCode).json({ success: false, message });
}
//# sourceMappingURL=error.middleware.js.map