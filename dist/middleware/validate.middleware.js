import { validateEmail, validatePassword } from "../security/sanitize.security.js";
function fail(res, message) {
    res.status(400).json({ success: false, message });
}
export const validateRegister = (req, res, next) => {
    const { name, email, password } = req.body;
    if (!name || String(name).trim().length < 2) {
        fail(res, "Name must be at least 2 characters.");
        return;
    }
    if (!validateEmail(email)) {
        fail(res, "Please provide a valid email address.");
        return;
    }
    if (!validatePassword(password)) {
        fail(res, "Password must be at least 8 characters.");
        return;
    }
    next();
};
export const validateLogin = (req, res, next) => {
    const { email, password } = req.body;
    if (!validateEmail(email)) {
        fail(res, "Please provide a valid email address.");
        return;
    }
    if (!password) {
        fail(res, "Password is required.");
        return;
    }
    next();
};
export const validateForgotPassword = (req, res, next) => {
    if (!validateEmail(req.body.email)) {
        fail(res, "Please provide a valid email address.");
        return;
    }
    next();
};
export const validateVerifyOtp = (req, res, next) => {
    const { email, otp } = req.body;
    if (!validateEmail(email)) {
        fail(res, "Valid email is required.");
        return;
    }
    if (!otp || !/^\d{6}$/.test(String(otp))) {
        fail(res, "OTP must be exactly 6 digits.");
        return;
    }
    next();
};
export const validateResetPassword = (req, res, next) => {
    const { resetToken, newPassword } = req.body;
    if (!resetToken) {
        fail(res, "Reset token is required.");
        return;
    }
    if (!validatePassword(newPassword)) {
        fail(res, "Password must be at least 8 characters.");
        return;
    }
    next();
};
/**
 * `validateProduct` — used on POST /products (create).
 * All core fields are required for a brand-new product.
 */
export const validateProduct = (req, res, next) => {
    const { name, description, price, category, image, stock } = req.body;
    if (!name || String(name).trim().length < 2) {
        fail(res, "Product name must be at least 2 characters.");
        return;
    }
    if (!description || String(description).trim().length < 5) {
        fail(res, "Description must be at least 5 characters.");
        return;
    }
    if (price === undefined || isNaN(Number(price)) || Number(price) < 0) {
        fail(res, "Price must be a valid non-negative number.");
        return;
    }
    if (!category || String(category).trim().length === 0) {
        fail(res, "Category is required.");
        return;
    }
    if (!image || String(image).trim().length === 0) {
        fail(res, "Image URL is required.");
        return;
    }
    if (stock !== undefined && (isNaN(Number(stock)) || Number(stock) < 0)) {
        fail(res, "Stock must be a valid non-negative number.");
        return;
    }
    next();
};
/**
 * `validateProductUpdate` — used on PUT /products/:id.
 * Every field is optional (partial update), but whichever fields ARE
 * present must still be valid.
 */
export const validateProductUpdate = (req, res, next) => {
    const { name, description, price, image, stock } = req.body;
    if (name !== undefined && String(name).trim().length < 2) {
        fail(res, "Product name must be at least 2 characters.");
        return;
    }
    if (description !== undefined && String(description).trim().length < 5) {
        fail(res, "Description must be at least 5 characters.");
        return;
    }
    if (price !== undefined && (isNaN(Number(price)) || Number(price) < 0)) {
        fail(res, "Price must be a valid non-negative number.");
        return;
    }
    if (image !== undefined && String(image).trim().length === 0) {
        fail(res, "Image URL cannot be empty.");
        return;
    }
    if (stock !== undefined && (isNaN(Number(stock)) || Number(stock) < 0)) {
        fail(res, "Stock must be a valid non-negative number.");
        return;
    }
    next();
};
//# sourceMappingURL=validate.middleware.js.map