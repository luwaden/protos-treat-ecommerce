import type { User } from "@prisma/client";
export declare function toPublicUser(user: User): {
    id: string;
    name: string;
    email: string;
    role: import("@prisma/client").$Enums.UserRole;
    createdAt: Date;
};
export type PublicUser = ReturnType<typeof toPublicUser>;
//# sourceMappingURL=user.utils.d.ts.map