import { PrismaClient } from "@prisma/client";
import { env } from "../config/env.js"; // Import your custom environment config object
const globalForPrisma = globalThis;
export const prisma = globalForPrisma.prisma ??
    new PrismaClient({
        log: ["error", "warn"],
    });
// Uses your custom boolean check safely without process.env type clashing!
if (env.isDev) {
    globalForPrisma.prisma = prisma;
}
//# sourceMappingURL=prisma.js.map