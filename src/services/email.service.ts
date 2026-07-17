

// Step 1: Generate a Gmail App Password
// Google requires an App Password (a unique 16-character code) to let third-party applications like your Express backend bypass 2FA safely.

// Go to your Google Account Settings.

// In the search bar at the top, type "App passwords" and select it.

// Enter a name for your app (e.g., Protos Treat Backend).

// Click Create. Google will display a 16-character code inside a yellow box. Copy this code immediately (spaces don't matter).


//=========================================================
import nodemailer from "nodemailer";
import type { Transporter } from "nodemailer";
import { env } from "../config/env.js";
import type  { EmailOptions } from "../types/index.js";

class EmailService {
  private transporter: Transporter;

  constructor() {
    this.transporter = nodemailer.createTransport({
      host:   env.email.host,
      port:   env.email.port,
      secure: true,
      auth:   { user: env.email.user, pass: env.email.pass },
    });
  }

  private async send(options: EmailOptions): Promise<void> {
    await this.transporter.sendMail({
      from:    env.email.from,
      to:      options.to,
      subject: options.subject,
      html:    options.html,
    });
  }

  async sendOtp(to: string, otp: string): Promise<void> {
    await this.send({
      to,
      subject: `${otp} is your Protos Treat password reset code`,
      html: `
        <div style="font-family:Arial,sans-serif;max-width:480px;margin:0 auto;padding:24px">
          <h1 style="color:#b21c21;margin:0 0 20px">🌿 Protos Treat</h1>
          <div style="background:#fff7ed;border:1px solid #fed7aa;border-radius:12px;padding:24px;text-align:center">
            <h2 style="color:#1f2937;margin-top:0">Password Reset Code</h2>
            <p style="color:#4b5563">This code expires in <strong>${env.otpExpiryMinutes} minutes</strong>.</p>
            <div style="background:#fff;border:2px solid #f97316;border-radius:10px;padding:20px;display:inline-block">
              <span style="font-size:40px;font-weight:700;letter-spacing:10px;color:#b21c21;font-family:monospace">${otp}</span>
            </div>
            <p style="color:#6b7280;font-size:13px;margin-top:16px">If you did not request this, ignore this email.</p>
          </div>
        </div>`,
    });
    console.log(`📧  OTP sent → ${to}`);
  }

  async sendWelcome(to: string, name: string): Promise<void> {
    await this.send({
      to,
      subject: `Welcome to Protos Treat, ${name}!`,
      html: `
        <div style="font-family:Arial,sans-serif;max-width:480px;margin:0 auto;padding:24px">
          <h1 style="color:#b21c21;margin:0 0 20px">🌿 Protos Treat</h1>
          <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:12px;padding:24px">
            <h2 style="color:#1f2937;margin-top:0">Welcome, ${name}! 🎉</h2>
            <p style="color:#4b5563">Your account is ready. Start shopping now.</p>
            <a href="${env.frontendUrl}" style="display:inline-block;background:#f97316;color:#fff;padding:12px 28px;border-radius:8px;text-decoration:none;font-weight:bold;margin-top:12px">
              Browse Products →
            </a>
          </div>
        </div>`,
    });
    console.log(`📧  Welcome email sent → ${to}`);
  }

  async sendOrderConfirmation(to: string, name: string, reference: string, amount: number): Promise<void> {
    await this.send({
      to,
      subject: `Order confirmed — ${reference}`,
      html: `
        <div style="font-family:Arial,sans-serif;max-width:480px;margin:0 auto;padding:24px">
          <h1 style="color:#b21c21;margin:0 0 20px">🌿 Protos Treat</h1>
          <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:12px;padding:24px">
            <h2 style="color:#1f2937;margin-top:0">Order Confirmed ✓</h2>
            <p style="color:#4b5563">Hi ${name}, your payment was successful.</p>
            <table style="width:100%;border-collapse:collapse;margin-top:16px">
              <tr><td style="color:#6b7280;padding:8px 0;border-bottom:1px solid #e5e7eb">Reference</td>
                  <td style="font-weight:600;text-align:right;padding:8px 0;border-bottom:1px solid #e5e7eb">${reference}</td></tr>
              <tr><td style="color:#6b7280;padding:8px 0">Amount Paid</td>
                  <td style="color:#b21c21;font-weight:700;text-align:right;padding:8px 0">$${amount.toFixed(2)}</td></tr>
            </table>
          </div>
        </div>`,
    });
  }
}

export default new EmailService();


// EMAIL_HOST=smtp.gmail.com
// EMAIL_PORT=587
// EMAIL_USER=your-actual-email@gmail.com
// EMAIL_PASS=abcd efgh ijkl mnop
// EMAIL_FROM="Protos Treat" <your-actual-email@gmail.com>