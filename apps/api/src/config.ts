export type ApiConfig = {
  port: number;
  webOrigins: string[];
  sessionSecret: string;
  sessionDays: number;
  paymentGatewayBaseUrl: string;
  paymentGatewayApiKey: string;
  paymentWebhookSecret: string;
};

export function loadConfig(): ApiConfig {
  return {
    port: Number(process.env.API_PORT ?? 4000),
    webOrigins: process.env.WEB_ORIGIN?.split(',') ?? ['http://localhost:3000'],
    sessionSecret: process.env.AUTH_SESSION_SECRET ?? 'dev-only-session-secret',
    sessionDays: Number(process.env.AUTH_SESSION_DAYS ?? 30),
    paymentGatewayBaseUrl:
      process.env.PAYMENT_GATEWAY_BASE_URL ?? 'https://qris.hubify.store/api',
    paymentGatewayApiKey: process.env.PAYMENT_GATEWAY_API_KEY ?? '',
    paymentWebhookSecret: process.env.PAYMENT_WEBHOOK_SECRET ?? '',
  };
}
