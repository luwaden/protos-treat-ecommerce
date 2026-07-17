import axios from "axios";
import { env } from "../config/env.js";
class PaystackService {
    baseUrl = "https://api.paystack.co";
    secretKey;
    constructor() {
        this.secretKey = env.paystack.secretKey;
    }
    get headers() {
        return {
            Authorization: `Bearer ${this.secretKey}`,
            "Content-Type": "application/json",
        };
    }
    async request(method, path, body) {
        const { data } = await axios({
            method,
            url: `${this.baseUrl}${path}`,
            headers: this.headers,
            data: body,
        });
        return data.data;
    }
    async initializeTransaction(email, amount, reference, metadata) {
        return this.request("POST", "/transaction/initialize", {
            email, amount, reference, metadata,
            callback_url: `${env.frontendUrl}/payment/callback`,
        });
    }
    async verifyTransaction(reference) {
        return this.request("GET", `/transaction/verify/${reference}`);
    }
    /**
     * Requests a refund for a previously-successful transaction.
     * Used by AdminController.cancelOrder — when an admin cancels an order
     * that has already been paid for, we ask Paystack to reverse the charge
     * rather than just changing a status in our own database.
     *
     * Paystack processes refunds asynchronously on their end (it doesn't
     * complete instantly) — this call just successfully REQUESTS the refund.
     */
    async refundTransaction(reference) {
        return this.request("POST", "/refund", { transaction: reference });
    }
}
export default new PaystackService();
//# sourceMappingURL=paystack.service.js.map