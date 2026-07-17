import { prisma } from "../lib/prisma.js";
import { PaymentStatus, OrderStatus } from "@prisma/client";
import paystackService from "./paystack.service.js";
import { AppError } from "../middleware/error.middleware.js";

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
 
export const orderService = {
 
  async _syncInStockFlags(productIds: string[]): Promise<void> {
    if (productIds.length === 0) return;
    await prisma.product.updateMany({
      where: { id: { in: productIds }, stock: { lte: 0 } },
      data: { inStock: false },
    });
    await prisma.product.updateMany({
      where: { id: { in: productIds }, stock: { gt: 0 } },
      data: { inStock: true },
    });
  },

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
  async _filterExistingItems(items: { productId: string; quantity: number }[]) {
    const ids = items.map((i) => i.productId);
    const existing = await prisma.product.findMany({
      where: { id: { in: ids } },
      select: { id: true },
    });
    const existingIds = new Set(existing.map((p) => p.id));
    return items.filter((i) => existingIds.has(i.productId));
  },

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
  async markOrderPaid(reference: string, paidAt: Date) {
    const order = await prisma.order.findUnique({ where: { paymentReference: reference } });
    if (!order) return null;

    // Already processed (by the other caller) — do nothing further.
    if (order.paymentStatus === PaymentStatus.Paid) return order;

    const validItems = await this._filterExistingItems(order.items);

    // $transaction runs every update here as a single all-or-nothing unit —
    // if any one product update fails, NONE of them apply, so stock counts
    // can never end up "half decremented" for an order.
    const [updatedOrder] = await prisma.$transaction([
      prisma.order.update({
        where: { paymentReference: reference },
        data: { paymentStatus: PaymentStatus.Paid, paidAt },
      }),
      ...validItems.map((item) =>
        prisma.product.update({
          where: { id: item.productId },
          data: { stock: { decrement: item.quantity } },
        })
      ),
    ]);

    await this._syncInStockFlags(validItems.map((i) => i.productId));

    return updatedOrder;
  },

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
  async cancelOrder(orderId: string) {
    const order = await prisma.order.findUnique({ where: { id: orderId } });
    if (!order) throw new AppError("Order not found.", 404);

    if (order.orderStatus === OrderStatus.Cancelled) {
      throw new AppError("This order has already been cancelled.", 400);
    }
    if (order.orderStatus === OrderStatus.Delivered) {
      throw new AppError("A delivered order can't be cancelled.", 400);
    }

    let refundMessage = "";
    let newPaymentStatus = order.paymentStatus;

    if (order.paymentStatus === PaymentStatus.Paid) {
      try {
        await paystackService.refundTransaction(order.paymentReference);
        newPaymentStatus = PaymentStatus.Refunded;
        refundMessage = " A refund has been requested through Paystack.";
      } catch (err) {
        // Don't block the cancellation just because the refund call
        // failed (e.g. Paystack test-mode limitations) — cancel the
        // order regardless, but tell the admin they'll need to handle
        // the refund by hand.
        console.error("⚠️  Paystack refund failed:", err);
        refundMessage = " Automatic refund could not be processed — please refund manually via the Paystack dashboard.";
      }
    }

    const validItems = await this._filterExistingItems(order.items);

    const [updatedOrder] = await prisma.$transaction([
      prisma.order.update({
        where: { id: orderId },
        data: {
          orderStatus: OrderStatus.Cancelled,
          paymentStatus: newPaymentStatus,
          cancelledAt: new Date(),
        },
      }),
      // Put every item's quantity back into stock.
      ...validItems.map((item) =>
        prisma.product.update({
          where: { id: item.productId },
          data: { stock: { increment: item.quantity } },
        })
      ),
    ]);

    await this._syncInStockFlags(validItems.map((i) => i.productId));

    return { order: updatedOrder, message: `Order cancelled.${refundMessage}` };
  },
};
