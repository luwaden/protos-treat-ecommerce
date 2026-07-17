import crypto from "crypto";
export function generateOtp() {
    return Math.floor(100000 + Math.random() * 900000).toString();
}
export function generateResetToken() {
    return crypto.randomBytes(32).toString("hex");
}
//# sourceMappingURL=otp.utils.js.map