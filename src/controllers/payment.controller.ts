import type { Request, Response, NextFunction } from "express";
import crypto from "crypto";
import { prisma } from "../lib/prisma.js";
import emailService from "../services/email.service.js";
import paystackService from "../services/paystack.service.js";
import { orderService } from "../services/order.service.js";
import { type AuthRequest } from "../middleware/auth.middleware.js";
import { AppError } from "../middleware/error.middleware.js";
import { PaymentStatus, type InitiatePaymentBody } from "../types/index.js";
import { sendResponse } from "../utils/response.utils.js";
import { env } from "../config/env.js";

/**
 * PaymentController
 * -----------------------------------------------------------------------
 * Everything here reads and writes the `Order` model through **Prisma** —
 * the same client used everywhere else in this project (auth, products).
 * There is no separate database driver for orders anymore.
 * -----------------------------------------------------------------------
 */
class PaymentController {
  initiate = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = (req as AuthRequest).user!.userId;
   const {
  email,
  amount,
  orderId,
  metadata,
}: InitiatePaymentBody = req.body;

if (!email || !amount || !orderId) {
  throw new AppError(
    "email, amount and orderId are required.",
    400
  );
}

if (!metadata?.shippingAddress) {
  throw new AppError(
    "Shipping address is required.",
    400
  );
}
      const reference = `PTR-${orderId}-${Date.now()}`;

      const txData = await paystackService.initializeTransaction(email, amount, reference, metadata);

     await prisma.order.create({
  data: {
    userId,
    items:
      metadata.items.map((item) => ({
        productId: item.id,
        name: item.name,
        price: item.price ?? 0,
        quantity: item.qty,
        image: item.image ?? "",
      })),
    totalAmount: amount / 100,
    paymentReference: reference,
    paymentStatus: PaymentStatus.Pending,
    shippingAddress: metadata.shippingAddress,
  },
});

      sendResponse(res, 200, true, "Payment initialised.", {
        reference: txData.reference,
        access_code: txData.access_code,
        authorization_url: txData.authorization_url,
      });
    } catch (err) {
      next(err);
    }
  };

  verify = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { reference } = req.params;

      if (!reference) {
        throw new AppError("Payment reference is required.", 400);
      }

      const txData = await paystackService.verifyTransaction(reference);

      if (txData.status === "success") {
        // markOrderPaid updates the order AND decrements stock for its
        // items, atomically, and is safe to call more than once for the
        // same order (see order.service.ts for why that matters — the
        // webhook below can also call this for the same payment).
        const order = await orderService.markOrderPaid(reference, new Date(txData.paid_at));

        if (order) {
          const user = await prisma.user.findUnique({ where: { id: order.userId } });
          if (user) {
            emailService
              .sendOrderConfirmation(user.email, user.name, reference, order.totalAmount)
              .catch(console.error);
          }
        }

        sendResponse(res, 200, true, "Payment verified.", {
          status: "success",
          reference: txData.reference,
          amount: txData.amount / 100,
          paid_at: txData.paid_at,
        });
      } else {
        await prisma.order
          .update({ where: { paymentReference: reference }, data: { paymentStatus: PaymentStatus.Failed } })
          .catch(() => null);

        sendResponse(res, 200, true, "Payment was not successful.", { status: "failed", reference });
      }
    } catch (err) {
      next(err);
    }
  };

  webhook = async (req: Request, res: Response, _next: NextFunction): Promise<void> => {
    try {
      const signature = req.headers["x-paystack-signature"] as string;
      const expected = crypto
        .createHmac("sha512", env.paystack.secretKey)
        .update(JSON.stringify(req.body))
        .digest("hex");

      if (signature !== expected) {
        res.status(401).json({ message: "Invalid webhook signature." });
        return;
      }

      if (req.body.event === "charge.success") {
        const { reference, paid_at } = req.body.data;
        // Same shared, idempotent function the /verify route uses — if
        // the frontend's /verify call already processed this payment,
        // this is a no-op (see the guard inside markOrderPaid).
        await orderService.markOrderPaid(reference, new Date(paid_at)).catch(() => null);
        console.log(`✅  Webhook: payment confirmed — ${reference}`);
      }

      res.status(200).json({ received: true });
    } catch {
      res.status(200).json({ received: true });
    }
  };
}

export default new PaymentController();
