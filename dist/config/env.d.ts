export type JwtExpiry = "15m" | "1h" | "2h" | "1d" | "7d" | number;
export declare const env: {
    readonly port: number;
    readonly nodeEnv: string;
    readonly isDev: boolean;
    readonly mongoUri: string;
    readonly accessTokenSecret: string;
    readonly refreshTokenSecret: string;
    readonly accessTokenExpiresIn: JwtExpiry;
    readonly refreshTokenExpiresIn: JwtExpiry;
    readonly redisUrl: string;
    readonly redisRefreshExpirySec: number;
    readonly frontendUrl: string;
    readonly email: {
        readonly host: string;
        readonly port: number;
        readonly user: string;
        readonly pass: string;
        readonly from: string;
    };
    readonly paystack: {
        readonly secretKey: string;
        readonly publicKey: string;
    };
    readonly cloudinary: {
        readonly cloudName: string;
        readonly apiKey: string;
        readonly apiSecret: string;
    };
    readonly bcryptSaltRounds: number;
    readonly otpExpiryMinutes: number;
    readonly superAdmin: {
        readonly email: string;
        readonly password: string;
    };
    readonly rateLimit: {
        readonly windowMs: number;
        readonly max: number;
    };
};
//# sourceMappingURL=env.d.ts.map