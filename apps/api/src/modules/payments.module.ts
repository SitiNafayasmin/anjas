import { Body, Controller, Get, Headers, Module, Param, Post, Req, UnauthorizedException } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import type { FastifyRequest } from 'fastify';
import { z } from 'zod';
import { loadConfig } from '../config.js';
import { hmacSha256Hex, safeEqual } from '../lib/crypto.js';
import { authenticateSession, requireVerifiedSession } from './auth.module.js';

const prisma = new PrismaClient();

const createPaymentSchema = z.object({
  planSlug: z.string().min(1).max(80),
});

const paymentWebhookSchema = z.object({
  amount: z.number().int().positive(),
  order_id: z.string().min(1),
  customer_id: z.string().optional(),
  status: z.string(),
  payment_method: z.string().optional(),
  completed_at: z.string().optional(),
});

type CreateTransactionResponse = {
  success: boolean;
  data?: {
    transaction_id: string;
    amount_original: number;
    amount_unique?: number;
    amount_total: number;
    qris_content?: string;
    expires_at?: string;
    status: string;
  };
  error?: string;
};

type StatusResponse = {
  success: boolean;
  data?: {
    transaction_id: string;
    status: string;
    amount_total: number;
    paid_at?: string;
  };
};

async function createGatewayTransaction(input: {
  amount: number;
  orderId: string;
  customerId: string;
  expiresInMinutes: number;
}) {
  const config = loadConfig();

  if (!config.paymentGatewayApiKey) {
    return null;
  }

  const response = await fetch(`${config.paymentGatewayBaseUrl}/create-transaction`, {
    method: 'POST',
    headers: {
      authorization: `Bearer ${config.paymentGatewayApiKey}`,
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      amount: input.amount,
      order_id: input.orderId,
      customer_id: input.customerId,
      expires_in_minutes: input.expiresInMinutes,
    }),
  });

  if (!response.ok) {
    throw new Error(`Payment gateway returned ${response.status}`);
  }

  return (await response.json()) as CreateTransactionResponse;
}

async function checkGatewayStatus(transactionId: string) {
  const config = loadConfig();

  if (!config.paymentGatewayApiKey) {
    return null;
  }

  const response = await fetch(`${config.paymentGatewayBaseUrl}/check-status/${transactionId}`, {
    headers: {
      authorization: `Bearer ${config.paymentGatewayApiKey}`,
    },
  });

  if (!response.ok) {
    throw new Error(`Payment status check returned ${response.status}`);
  }

  return (await response.json()) as StatusResponse;
}

async function activateSubscription(paymentId: string, paidAt: Date) {
  const payment = await prisma.paymentTransaction.update({
    where: { id: paymentId },
    data: { status: 'PAID', paidAt },
    include: { plan: true },
  });

  await prisma.subscription.updateMany({
    where: { userId: payment.userId, status: { in: ['TRIAL', 'ACTIVE'] } },
    data: { status: 'CANCELED' },
  });

  await prisma.subscription.create({
    data: {
      userId: payment.userId,
      planId: payment.planId,
      status: 'ACTIVE',
      currentStart: paidAt,
      currentEnd: new Date(paidAt.getTime() + 30 * 24 * 60 * 60 * 1000),
    },
  });

  return payment;
}

function verifyWebhookSignature(
  body: unknown,
  headers: {
    simpleSecret?: string;
    signature?: string;
    signatureV2?: string;
  },
) {
  const config = loadConfig();
  const secret = config.paymentWebhookSecret;

  if (!secret) {
    return { verified: false, skipped: true };
  }

  if (headers.simpleSecret && safeEqual(headers.simpleSecret, secret)) {
    return { verified: true, skipped: false };
  }

  const payload = JSON.stringify(body);

  if (headers.signature) {
    const expected = hmacSha256Hex(secret, payload);
    return { verified: safeEqual(headers.signature, expected), skipped: false };
  }

  if (headers.signatureV2) {
    const parts = new Map(
      headers.signatureV2.split(',').map((part) => {
        const [key, value] = part.split('=');
        return [key, value] as const;
      }),
    );
    const timestamp = parts.get('t');
    const signature = parts.get('v1');

    if (!timestamp || !signature) {
      return { verified: false, skipped: false };
    }

    const timestampSeconds = Number(timestamp);
    const nowSeconds = Math.floor(Date.now() / 1000);

    if (!Number.isFinite(timestampSeconds) || Math.abs(nowSeconds - timestampSeconds) > 300) {
      return { verified: false, skipped: false };
    }

    const expected = hmacSha256Hex(secret, `${timestamp}.${payload}`);
    return { verified: safeEqual(signature, expected), skipped: false };
  }

  return { verified: false, skipped: false };
}

@Controller('payments')
class PaymentsController {
  @Post('checkout')
  async checkout(@Req() request: FastifyRequest, @Body() body: unknown) {
    const user = await requireVerifiedSession(request);
    const input = createPaymentSchema.parse(body);
    const plan = await prisma.plan.findUniqueOrThrow({
      where: { slug: input.planSlug },
    });

    if (plan.monthlyPriceIdr <= 0) {
      return { error: 'Selected plan does not require payment' };
    }

    const orderId = `sub_${user.id}_${Date.now()}`;
    const gateway = await createGatewayTransaction({
      amount: plan.monthlyPriceIdr,
      orderId,
      customerId: user.id,
      expiresInMinutes: 30,
    });
    const data = gateway?.data;
    const payment = await prisma.paymentTransaction.create({
      data: {
        userId: user.id,
        planId: plan.id,
        orderId,
        providerTransactionId: data?.transaction_id,
        amountOriginal: data?.amount_original ?? plan.monthlyPriceIdr,
        amountUnique: data?.amount_unique ?? 0,
        amountTotal: data?.amount_total ?? plan.monthlyPriceIdr,
        qrisContent: data?.qris_content,
        expiresAt: data?.expires_at ? new Date(data.expires_at) : new Date(Date.now() + 30 * 60 * 1000),
        rawProviderResponse: gateway ? JSON.parse(JSON.stringify(gateway)) : undefined,
      },
    });

    return {
      payment,
      gatewayConfigured: Boolean(loadConfig().paymentGatewayApiKey),
    };
  }

  @Get()
  async list(@Req() request: FastifyRequest) {
    const user = await authenticateSession(request);
    const payments = await prisma.paymentTransaction.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });

    return { payments };
  }

  @Get('subscription/status')
  async subscriptionStatus(@Req() request: FastifyRequest) {
    const user = await authenticateSession(request);
    const subscription = await prisma.subscription.findFirst({
      where: { userId: user.id, status: { in: ['TRIAL', 'ACTIVE', 'SUSPENDED'] } },
      include: { plan: true },
      orderBy: { createdAt: 'desc' },
    });

    return { subscription };
  }

  @Post('subscription/cancel')
  async cancelSubscription(@Req() request: FastifyRequest) {
    const user = await authenticateSession(request);
    await prisma.subscription.updateMany({
      where: { userId: user.id, status: { in: ['TRIAL', 'ACTIVE'] } },
      data: { status: 'CANCELED' },
    });

    return { ok: true };
  }

  @Post(':orderId/reconcile')
  async reconcile(@Req() request: FastifyRequest, @Param('orderId') orderId: string) {
    const user = await authenticateSession(request);
    const payment = await prisma.paymentTransaction.findFirstOrThrow({
      where: { userId: user.id, orderId },
    });

    if (!payment.providerTransactionId) {
      return { payment, gatewayConfigured: false };
    }

    const status = await checkGatewayStatus(payment.providerTransactionId);

    if (status?.data?.status === 'paid') {
      const updated = await activateSubscription(
        payment.id,
        status.data.paid_at ? new Date(status.data.paid_at) : new Date(),
      );
      return { payment: updated, reconciled: true };
    }

    if (status?.data?.status === 'expired') {
      const updated = await prisma.paymentTransaction.update({
        where: { id: payment.id },
        data: { status: 'EXPIRED' },
      });
      return { payment: updated, reconciled: true };
    }

    return { payment, gatewayStatus: status?.data?.status ?? null, reconciled: false };
  }

  @Get(':orderId')
  async get(@Req() request: FastifyRequest, @Param('orderId') orderId: string) {
    const user = await authenticateSession(request);
    const payment = await prisma.paymentTransaction.findFirstOrThrow({
      where: { userId: user.id, orderId },
    });

    return { payment };
  }
}

@Controller('webhooks/payment')
class PaymentWebhookController {
  @Post()
  async paymentWebhook(
    @Body() body: unknown,
    @Headers('x-webhook-secret') simpleSecret: string | undefined,
    @Headers('x-webhook-signature') signature: string | undefined,
    @Headers('x-webhook-signature-v2') signatureV2: string | undefined,
  ) {
    const verification = verifyWebhookSignature(body, { simpleSecret, signature, signatureV2 });

    if (!verification.verified && !verification.skipped) {
      throw new UnauthorizedException('Invalid payment webhook signature');
    }

    const payload = paymentWebhookSchema.parse(body);

    if (payload.status !== 'completed') {
      return { ok: true, ignored: true };
    }

    const existingPayment = await prisma.paymentTransaction.findUniqueOrThrow({
      where: { orderId: payload.order_id },
    });
    const payment = await activateSubscription(
      existingPayment.id,
      payload.completed_at ? new Date(payload.completed_at) : new Date(),
    );

    return {
      ok: true,
      verified: verification.verified,
      verificationSkipped: verification.skipped,
      orderId: payment.orderId,
    };
  }
}

@Module({
  controllers: [PaymentsController, PaymentWebhookController],
})
export class PaymentsModule {}
