/**
 * order.service.ts
 * -----------------------------------------------------------------------
 * Order lifecycle logic lives here, in ONE place, because two different
 * callers both need to move an order between states:
 *   - payment.controller.ts  -> marks an order Paid (from Paystack verify/webhook)
 *   - admin.controller.ts    -> cancels an order (from the admin dashboard)
 *
 * Without a shared service, this logic would get copy-pasted into both
 * controllers, and the two copies would slowly drift apart as the app
 * grows. Controllers stay thin — they just call these functions and
 * turn the result into an HTTP response.
 * -----------------------------------------------------------------------
 *
 *
 *  /**
   * `stock` and `inStock` are two separate fields on Product — `stock` is
   * the number, `inStock` is the boolean the storefront's "Out of stock"
   * badge actually checks. Prisma's `{ decrement }` / `{ increment }`
   * only touch `stock`, so after any bulk stock change we resync
   * `inStock` to match, using two lightweight `updateMany` calls instead
   * of reading and rewriting every product one by one.
   */
export declare const orderService: {
    _syncInStockFlags(productIds: string[]): Promise<void>;
    /**
     * Prisma's `$transaction([array of operations])` requires every item in
     * that array to be a genuine Prisma operation — you can't `.catch()` one
     * of them first, or wrap it in extra logic, or Prisma will reject the
     * whole call at runtime. So instead of "try to update every product and
     * swallow errors for missing ones", we check WHICH product ids from this
     * order still exist first (one query), and only build transaction steps
     * for those. A product deleted after the order was placed is a rare
     * edge case, but this keeps that edge case from ever crashing a payment
     * or a cancellation.
     */
    _filterExistingItems(items: {
        productId: string;
        quantity: number;
    }[]): Promise<{
        productId: string;
        quantity: number;
    }[]>;
    /**
     * Marks an order as Paid AND decrements stock for every item in it.
     *
     * Called from TWO places (Paystack's webhook, and the frontend's manual
     * "verify" call) — both might fire for the same successful payment.
     * The `if (order.paymentStatus === PaymentStatus.Paid) return order;`
     * guard makes this function IDEMPOTENT: calling it twice for the same
     * order only decrements stock once. Without that guard, a customer's
     * stock could be deducted twice for one order.
     */
    markOrderPaid(reference: string, paidAt: Date): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        userId: string;
        totalAmount: number;
        paymentReference: string;
        paymentStatus: import("@prisma/client").$Enums.PaymentStatus;
        orderStatus: import("@prisma/client").$Enums.OrderStatus;
        paidAt: Date | null;
        cancelledAt: Date | null;
        items: {
            productId: string;
            name: string;
            price: number;
            quantity: number;
            image: string;
        }[];
        shippingAddress: {
            firstName: string;
            lastName: string;
            email: string;
            phone: string;
            address: string;
            city: string;
        } | null;
    } | null>;
    /**
     * Cancels an order — used by the admin dashboard's "Cancel" button.
     *
     * Business rules enforced here (not in the controller, so they can
     * never be skipped no matter which route calls this):
     *   - Can't cancel an order that's already Cancelled or Delivered.
     *   - If the order was already paid for, ask Paystack to refund it.
     *   - Either way, restock every item — the products are going back
     *     on the (virtual) shelf.
     */
    cancelOrder(orderId: string): Promise<{
        order: {
            id: string;
            createdAt: Date;
            updatedAt: Date;
            userId: string;
            totalAmount: number;
            paymentReference: string;
            paymentStatus: import("@prisma/client").$Enums.PaymentStatus;
            orderStatus: import("@prisma/client").$Enums.OrderStatus;
            paidAt: Date | null;
            cancelledAt: Date | null;
            items: {
                productId: string;
                name: string;
                price: number;
                quantity: number;
                image: string;
            }[];
            shippingAddress: {
                firstName: string;
                lastName: string;
                email: string;
                phone: string;
                address: string;
                city: string;
            } | null;
        };
        message: string;
    }>;
};
//# sourceMappingURL=order.service.d.ts.map