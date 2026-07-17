import axios from "axios";
import { env } from "../config/env.js";
import type { PaystackInitData, PaystackVerifyData } from "../types/index.js";

interface PaystackApiResponse<T> {
  status: boolean;
  message: string;
  data: T;
}

class PaystackService {
  private readonly baseUrl = "https://api.paystack.co";
  private readonly secretKey: string;

  constructor() {
    this.secretKey = env.paystack.secretKey;
  }

  private get headers() {
    return {
      Authorization: `Bearer ${this.secretKey}`,
      "Content-Type": "application/json",
    };
  }

  private async request<T>(method: "GET" | "POST", path: string, body?: object): Promise<T> {
    const { data } = await axios<PaystackApiResponse<T>>({
      method,
      url: `${this.baseUrl}${path}`,
      headers: this.headers,
      data: body,
    });
    return data.data;
  }

  async initializeTransaction(
    email: string,
    amount: number,
    reference: string,
    metadata?: object
  ): Promise<PaystackInitData> {
    return this.request<PaystackInitData>("POST", "/transaction/initialize", {
      email, amount, reference, metadata,
      callback_url: `${env.frontendUrl}/payment/callback`,
    });
  }

  async verifyTransaction(reference: string): Promise<PaystackVerifyData> {
    return this.request<PaystackVerifyData>("GET", `/transaction/verify/${reference}`);
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
  async refundTransaction(reference: string): Promise<{ status: string }> {
    return this.request<{ status: string }>("POST", "/refund", { transaction: reference });
  }
}

export default new PaystackService();