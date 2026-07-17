import type { Request, Response, NextFunction } from "express";
import validator from "validator";

export function sanitizeBody(req: Request, _res: Response, next: NextFunction): void {
  function clean(value: unknown): unknown {
    if (typeof value === "string") {
      return validator.escape(validator.trim(value));
    }
    if (typeof value === "object" && value !== null) {
      return Object.fromEntries(
        Object.entries(value as Record<string, unknown>).map(([k, v]) => [k, clean(v)])
      );
    }
    return value;
  }

  if (req.body && typeof req.body === "object") {
    req.body = clean(req.body);
  }

  next();
}

export function validateEmail(email: unknown): boolean {
  return typeof email === "string" && validator.isEmail(email);
}

export function validatePassword(password: unknown): boolean {
  return typeof password === "string" && password.length >= 8;
}