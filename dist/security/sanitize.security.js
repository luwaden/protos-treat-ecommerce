import validator from "validator";
export function sanitizeBody(req, _res, next) {
    function clean(value) {
        if (typeof value === "string") {
            return validator.escape(validator.trim(value));
        }
        if (typeof value === "object" && value !== null) {
            return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, clean(v)]));
        }
        return value;
    }
    if (req.body && typeof req.body === "object") {
        req.body = clean(req.body);
    }
    next();
}
export function validateEmail(email) {
    return typeof email === "string" && validator.isEmail(email);
}
export function validatePassword(password) {
    return typeof password === "string" && password.length >= 8;
}
//# sourceMappingURL=sanitize.security.js.map