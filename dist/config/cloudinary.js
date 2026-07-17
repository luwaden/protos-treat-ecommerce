import { v2 as cloudinary } from "cloudinary";
import { env } from "./env.js";
/**
 * cloudinary.ts
 * -----------------------------------------------------------------------
 * Configures the Cloudinary SDK ONCE, using credentials from your .env
 * file, and exports the configured instance. Every other file that needs
 * to talk to Cloudinary (the upload middleware, the delete helper in
 * cloudinary.service.ts) imports THIS file — never re-configures it.
 *
 * This is the exact same "one shared, pre-configured instance" pattern
 * as `lib/prisma.ts` (one Prisma client) and `config/redis.ts` (one Redis
 * client). Read IMAGE_UPLOAD_EXPLAINED.md in the project root for the
 * full walkthrough of how an image travels from the admin's computer to
 * Cloudinary and back.
 * -----------------------------------------------------------------------
 */
cloudinary.config({
    cloud_name: env.cloudinary.cloudName,
    api_key: env.cloudinary.apiKey,
    api_secret: env.cloudinary.apiSecret,
});
export { cloudinary };
//# sourceMappingURL=cloudinary.js.map