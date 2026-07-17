import dotenv from "dotenv";
dotenv.config();

export type JwtExpiry = "15m" | "1h" | "2h" | "1d" | "7d" | number;

function required(key: string): string {
  const value = process.env[key];
  if (!value) throw new Error(`Missing required environment variable: ${key}`);
  return value;
}

function optional(key: string, fallback: string): string {
  return process.env[key] || fallback;
}

export const env = {
  port:             Number(optional("PORT", "5001")),
  nodeEnv:           optional("NODE_ENV", "development"),
  isDev:             optional("NODE_ENV", "development") === "development",

  mongoUri:          required("DATABASE_URL"),

 accessTokenSecret:  required("ACCESS_TOKEN_SECRET"),
  refreshTokenSecret: required("REFRESH_TOKEN_SECRET"),
  accessTokenExpiresIn:  optional("ACCESS_TOKEN_EXPIRES_IN", "15m") as JwtExpiry,
  refreshTokenExpiresIn: optional("REFRESH_TOKEN_EXPIRES_IN", "7d") as JwtExpiry,

  redisUrl:          optional("REDIS_URL", "redis://localhost:6379"),


  
  // Expiry window explicitly mapped for Redis engine (7 days in seconds)
  redisRefreshExpirySec: Number(optional("REDIS_REFRESH_EXPIRY_SEC", "604800")),

  frontendUrl:       optional("FRONTEND_URL", "http://localhost:5173"),

  email: {
    host:  optional("EMAIL_HOST", "smtp.gmail.com"),
    port:  Number(optional("EMAIL_PORT", "587")),
    user:  optional("EMAIL_USER", ""),
    pass:  optional("EMAIL_PASS", ""),
    from:  optional("EMAIL_FROM", "Protos Treat <noreply@protostreat.com>"),
  },

  paystack: {
    secretKey: optional("PAYSTACK_SECRET_KEY", ""),
    publicKey: optional("PAYSTACK_PUBLIC_KEY", ""),
  },

  cloudinary: {
    cloudName: optional("CLOUDINARY_CLOUD_NAME", ""),
    apiKey:    optional("CLOUDINARY_API_KEY", ""),
    apiSecret: optional("CLOUDINARY_API_SECRET", ""),
  },

  bcryptSaltRounds: Number(optional("BCRYPT_SALT_ROUNDS", "12")),
  otpExpiryMinutes: Number(optional("OTP_EXPIRY_MINUTES", "10")),

  superAdmin: {
    email:    optional("SUPER_ADMIN_EMAIL", "admin@protostreat.com"),
    password: optional("SUPER_ADMIN_PASSWORD", "ChangeMe123!"),
  },

  rateLimit: {
    windowMs: Number(optional("RATE_LIMIT_WINDOW_MS", "900000")),
    max:      Number(optional("RATE_LIMIT_MAX", "100")),
  },
} as const;