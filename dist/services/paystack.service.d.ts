import type { PaystackInitData, PaystackVerifyData } from "../types/index.js";
declare class PaystackService {
    private readonly baseUrl;
    private readonly secretKey;
    constructor();
    private get headers();
    private request;
    initializeTransaction(email: string, amount: number, reference: string, metadata?: object): Promise<PaystackInitData>;
    verifyTransaction(reference: string): Promise<PaystackVerifyData>;
    /**
     * Requests a refund for a previously-successful transaction.
     * Used by AdminController.cancelOrder — when an admin cancels an order
     * that has already been paid for, we ask Paystack to reverse the charge
     * rather than just changing a status in our own database.
     *
     * Paystack processes refunds asynchronously on their end (it doesn't
     * complete instantly) — this call just successfully REQUESTS the refund.
     */
    refundTransaction(reference: string): Promise<{
        status: string;
    }>;
}
declare const _default: PaystackService;
export default _default;
//# sourceMappingURL=paystack.service.d.ts.map