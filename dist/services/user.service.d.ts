import type { User } from "@prisma/client";
export declare const userService: {
    findByEmail(email: string): import("@prisma/client").Prisma.Prisma__UserClient<{
        role: import("@prisma/client").$Enums.UserRole;
        name: string;
        id: string;
        email: string;
        password: string;
        isBanned: boolean;
        loginAttempts: number;
        lockUntil: Date | null;
        createdAt: Date;
        updatedAt: Date;
    } | null, null, import("@prisma/client/runtime/library").DefaultArgs, import("@prisma/client").Prisma.PrismaClientOptions>;
    findById(id: string): import("@prisma/client").Prisma.Prisma__UserClient<{
        role: import("@prisma/client").$Enums.UserRole;
        name: string;
        id: string;
        email: string;
        password: string;
        isBanned: boolean;
        loginAttempts: number;
        lockUntil: Date | null;
        createdAt: Date;
        updatedAt: Date;
    } | null, null, import("@prisma/client/runtime/library").DefaultArgs, import("@prisma/client").Prisma.PrismaClientOptions>;
    /**
     * Creates a new user. We hash the password HERE, before it ever
     * touches the database — Prisma has no "pre-save" hook to do this
     * for us automatically like Mongoose did.
     */
    create(data: {
        name: string;
        email: string;
        password: string;
    }): Promise<User>;
    /**
     * Compares a plain-text password (from the login form) against the
     * hashed password stored in the database.
     */
    comparePassword(plainPassword: string, hashedPassword: string): Promise<boolean>;
    /**
     * Is this account currently locked out due to too many failed logins?
     */
    isLocked(user: User): boolean;
    /**
     * Called after a FAILED login attempt.
     * Increments the counter, and locks the account for 30 minutes
     * once the user has failed 5 times in a row.
     */
    incrementLoginAttempts(user: User): Promise<void>;
    /**
     * Called after a SUCCESSFUL login.
     * Clears the failed-attempt counter and any lock.
     */
    resetLoginAttempts(userId: string): Promise<void>;
    /**
     * Used by the "reset password" flow. Hashes and saves a new password.
     */
    updatePassword(userId: string, newPassword: string): Promise<void>;
};
//# sourceMappingURL=user.service.d.ts.map