declare class EmailService {
    private transporter;
    constructor();
    private send;
    sendOtp(to: string, otp: string): Promise<void>;
    sendWelcome(to: string, name: string): Promise<void>;
    sendOrderConfirmation(to: string, name: string, reference: string, amount: number): Promise<void>;
}
declare const _default: EmailService;
export default _default;
//# sourceMappingURL=email.service.d.ts.map