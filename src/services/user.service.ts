import bcrypt from "bcryptjs";
import type { User } from "@prisma/client";
import { prisma } from "../lib/prisma.js";
import { env } from "../config/env.js";



const MAX_LOGIN_ATTEMPTS = 5;
const LOCK_DURATION_MS = 30 * 60 * 1000; // 30 minutes

export const userService = {
  
  findByEmail(email: string) {
    return prisma.user.findUnique({ where: { email: email.toLowerCase() } });
  },

  findById(id: string) {
    return prisma.user.findUnique({ where: { id } });
  },

  /**
   * Creates a new user. We hash the password HERE, before it ever
   * touches the database — Prisma has no "pre-save" hook to do this
   * for us automatically like Mongoose did.
   */
  async create(data: { name: string; email: string; password: string }): Promise<User> {
    const hashedPassword = await bcrypt.hash(data.password, env.bcryptSaltRounds);

    return prisma.user.create({
      data: {
        name: data.name,
        email: data.email.toLowerCase(),
        password: hashedPassword,
      },
    });
  },

  /**
   * Compares a plain-text password (from the login form) against the
   * hashed password stored in the database.
   */
  comparePassword(plainPassword: string, hashedPassword: string): Promise<boolean> {
    return bcrypt.compare(plainPassword, hashedPassword);
  },

  /**
   * Is this account currently locked out due to too many failed logins?
   */
  isLocked(user: User): boolean {
    return !!(user.lockUntil && user.lockUntil > new Date());
  },

  /**
   * Called after a FAILED login attempt.
   * Increments the counter, and locks the account for 30 minutes
   * once the user has failed 5 times in a row.
   */
  async incrementLoginAttempts(user: User): Promise<void> {
    const attempts = user.loginAttempts + 1;

    const data: { loginAttempts: number; lockUntil?: Date } = {
      loginAttempts: attempts,
    };

    if (attempts >= MAX_LOGIN_ATTEMPTS) {
      data.lockUntil = new Date(Date.now() + LOCK_DURATION_MS);
    }

    await prisma.user.update({ where: { id: user.id }, data });
  },

  /**
   * Called after a SUCCESSFUL login.
   * Clears the failed-attempt counter and any lock.
   */
  async resetLoginAttempts(userId: string): Promise<void> {
    await prisma.user.update({
      where: { id: userId },
      data: { loginAttempts: 0, lockUntil: null },
    });
  },

  /**
   * Used by the "reset password" flow. Hashes and saves a new password.
   */
  async updatePassword(userId: string, newPassword: string): Promise<void> {
    const hashedPassword = await bcrypt.hash(newPassword, env.bcryptSaltRounds);
    await prisma.user.update({
      where: { id: userId },
      data: { password: hashedPassword },
    });
  },
};
