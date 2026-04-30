import cors from '@fastify/cors';
import rateLimit from '@fastify/rate-limit';
import type { ApiKey, Plan, Subscription } from '@prisma/client';
import Fastify, { type FastifyReply } from 'fastify';
import { Readable } from 'node:stream';
import type { ReadableStream } from 'node:stream/web';
import { hashApiKey, getBearerToken, type AuthenticatedApiKey } from './auth.js';
import { loadConfig } from './config.js';
import { prisma } from './db.js';
import { isPublicModelAlias, listModelAliases, resolveModelAlias } from './model-aliases.js';
import { checkDailyLimit, checkRateLimit, demoApiKeyFromToken, startStreamSlot } from './quota.js';
import { forwardToRouter } from './router-client.js';
import {
  completionBodySchema,
  estimateInputTokens,
  getRequestedModel,
  isStreamingRequest,
} from './validation.js';

const config = loadConfig();
const app = Fastify({ bodyLimit: config.maxBodyBytes, logger: true });

await app.register(cors, { origin: config.corsOrigins });
await app.register(rateLimit, {
  max: 600,
  timeWindow: '1 minute',
});

type ApiKeyWithSubscription = ApiKey & {
  user: {
    subscriptions: (Subscription & { plan: Plan })[];
  };
};

async function authenticate(request: Parameters<typeof getBearerToken>[0]): Promise<AuthenticatedApiKey | null> {
  const token = getBearerToken(request);

  if (!token) {
    return null;
  }

  const demo = demoApiKeyFromToken(token, config.demoApiKey);
  if (demo) {
    return demo;
  }

  const apiKey = (await prisma.apiKey.findUnique({
    where: { keyHash: hashApiKey(token) },
    include: {
      user: {
        include: {
          subscriptions: {
            where: { status: { in: ['TRIAL', 'ACTIVE'] } },
            include: { plan: true },
            orderBy: { createdAt: 'desc' },
            take: 1,
          },
        },
      },
    },
  })) as ApiKeyWithSubscription | null;

  const subscription = apiKey?.user.subscriptions[0];

  if (!apiKey || apiKey.status !== 'ACTIVE' || !subscription) {
    return null;
  }

  await prisma.apiKey.update({
    where: { id: apiKey.id },
    data: { lastUsedAt: new Date() },
  });

  return {
    id: apiKey.id,
    userId: apiKey.userId,
    prefix: apiKey.prefix,
    plan: {
      slug: subscription.plan.slug,
      monthlyTokenQuota: subscription.plan.monthlyTokenQuota,
      dailyRequestLimit: subscription.plan.dailyRequestLimit,
      requestsPerMinute: subscription.plan.requestsPerMinute,
      maxConcurrentStreams: subscription.plan.maxConcurrentStreams,
      allowedModelAliases: subscription.plan.allowedModelAliases,
    },
  };
}

function invalidApiKey(reply: FastifyReply) {
  return reply.code(401).send({
    error: {
      message: 'Invalid API key',
      type: 'invalid_request_error',
    },
  });
}

async function logRequest(input: {
  apiKey: AuthenticatedApiKey | null;
  method: string;
  path: string;
  modelAlias?: string;
  status: 'SUCCESS' | 'ERROR' | 'RATE_LIMITED' | 'QUOTA_EXCEEDED';
  statusCode: number;
  errorCode?: string;
  estimatedInputTokens?: number;
  latencyMs?: number;
  requestId: string;
}) {
  if (input.apiKey?.id.startsWith('demo:')) {
    return;
  }

  await prisma.requestLog.create({
    data: {
      userId: input.apiKey?.userId,
      apiKeyId: input.apiKey?.id,
      method: input.method,
      path: input.path,
      modelAlias: input.modelAlias,
      resolvedModel: resolveModelAlias(input.modelAlias),
      status: input.status,
      statusCode: input.statusCode,
      errorCode: input.errorCode,
      latencyMs: input.latencyMs,
      requestId: input.requestId,
    },
  });

  if (input.apiKey && input.status !== 'RATE_LIMITED' && input.status !== 'QUOTA_EXCEEDED') {
    await prisma.usageEvent.create({
      data: {
        userId: input.apiKey.userId,
        apiKeyId: input.apiKey.id,
        modelAlias: input.modelAlias ?? 'unknown',
        resolvedModel: resolveModelAlias(input.modelAlias),
        inputTokens: input.estimatedInputTokens ?? 0,
        status: input.status,
        latencyMs: input.latencyMs,
        requestId: input.requestId,
      },
    });
  }
}

type AccessResult =
  | { allowed: true }
  | { allowed: false; statusCode: number; code: string; message: string };

async function enforceAccess(
  apiKey: AuthenticatedApiKey,
  model: string | undefined,
  estimatedInputTokens: number,
): Promise<AccessResult> {
  if (isPublicModelAlias(model) && model && !apiKey.plan.allowedModelAliases.includes(model)) {
    return {
      allowed: false,
      statusCode: 403,
      code: 'model_not_allowed',
      message: `Model alias ${model} is not included in your plan`,
    };
  }

  const rate = await checkRateLimit(apiKey);
  if (!rate.allowed) {
    return {
      allowed: false,
      statusCode: 429,
      code: 'rate_limit_exceeded',
      message: 'Rate limit exceeded',
    };
  }

  const daily = await checkDailyLimit(apiKey);
  if (!daily.allowed) {
    return {
      allowed: false,
      statusCode: 429,
      code: 'daily_quota_exceeded',
      message: 'Daily request quota exceeded',
    };
  }

  if (!apiKey.id.startsWith('demo:')) {
    const monthStart = new Date();
    monthStart.setUTCDate(1);
    monthStart.setUTCHours(0, 0, 0, 0);
    const usage = await prisma.usageEvent.aggregate({
      where: { apiKeyId: apiKey.id, createdAt: { gte: monthStart } },
      _sum: { inputTokens: true, outputTokens: true },
    });
    const usedTokens = BigInt((usage._sum.inputTokens ?? 0) + (usage._sum.outputTokens ?? 0));

    if (usedTokens + BigInt(estimatedInputTokens) > apiKey.plan.monthlyTokenQuota) {
      return {
        allowed: false,
        statusCode: 429,
        code: 'monthly_token_quota_exceeded',
        message: 'Monthly token quota exceeded',
      };
    }
  }

  return { allowed: true };
}

function sendBodyWithRelease(
  body: Response['body'],
  release: () => Promise<void>,
): Response['body'] | NodeJS.ReadableStream {
  if (!body) {
    void release();
    return body;
  }

  let released = false;
  const releaseOnce = () => {
    if (!released) {
      released = true;
      void release();
    }
  };
  const nodeStream = Readable.fromWeb(body as unknown as ReadableStream<Uint8Array>);

  nodeStream.once('close', releaseOnce);
  nodeStream.once('end', releaseOnce);
  nodeStream.once('error', releaseOnce);

  return nodeStream;
}

app.get('/health', async () => ({
  ok: true,
  service: 'proxy',
  timestamp: new Date().toISOString(),
}));

app.get('/v1/models', async (request, reply) => {
  const apiKey = await authenticate(request);
  if (!apiKey) {
    return invalidApiKey(reply);
  }

  return {
    object: 'list',
    data: listModelAliases(),
  };
});

app.post('/v1/chat/completions', async (request, reply) => {
  const startedAt = Date.now();
  const requestId = request.id;
  const apiKey = await authenticate(request);
  if (!apiKey) {
    return invalidApiKey(reply);
  }

  const parsed = completionBodySchema.safeParse(request.body);
  if (!parsed.success) {
    return reply.code(400).send({
      error: {
        message: 'Invalid request body',
        type: 'invalid_request_error',
        issues: parsed.error.issues,
      },
    });
  }

  const model = getRequestedModel(parsed.data);
  const estimatedInputTokens = estimateInputTokens(parsed.data);
  const access = await enforceAccess(apiKey, model, estimatedInputTokens);
  if (!access.allowed) {
    await logRequest({
      apiKey,
      method: request.method,
      path: request.url,
      modelAlias: model,
      status: access.code === 'daily_quota_exceeded' ? 'QUOTA_EXCEEDED' : 'RATE_LIMITED',
      statusCode: access.statusCode,
      errorCode: access.code,
      estimatedInputTokens,
      latencyMs: Date.now() - startedAt,
      requestId,
    });
    return reply.code(access.statusCode).send({
      error: {
        message: access.message,
        type: 'invalid_request_error',
        code: access.code,
      },
    });
  }

  const streamSlot = isStreamingRequest(parsed.data)
    ? await startStreamSlot(apiKey)
    : { allowed: true, release: async () => undefined };

  if (!streamSlot.allowed) {
    await logRequest({
      apiKey,
      method: request.method,
      path: request.url,
      modelAlias: model,
      status: 'RATE_LIMITED',
      statusCode: 429,
      errorCode: 'concurrent_stream_limit_exceeded',
      latencyMs: Date.now() - startedAt,
      requestId,
    });
    return reply.code(429).send({
      error: {
        message: 'Too many concurrent streams',
        type: 'invalid_request_error',
        code: 'concurrent_stream_limit_exceeded',
      },
    });
  }

  const streaming = isStreamingRequest(parsed.data);
  let releaseInFinally = true;

  try {
    const upstream = await forwardToRouter({
      body: parsed.data,
      path: '/v1/chat/completions',
      routerApiKey: config.routerApiKey,
      routerBaseUrl: config.routerBaseUrl,
      timeoutMs: config.requestTimeoutMs,
    });

    reply.code(upstream.status);
    upstream.headers.forEach((value, key) => {
      if (['content-type', 'cache-control'].includes(key)) {
        reply.header(key, value);
      }
    });

    await logRequest({
      apiKey,
      method: request.method,
      path: request.url,
      modelAlias: model,
      status: upstream.ok ? 'SUCCESS' : 'ERROR',
      statusCode: upstream.status,
      errorCode: upstream.ok ? undefined : 'upstream_error',
      estimatedInputTokens,
      latencyMs: Date.now() - startedAt,
      requestId,
    });

    if (streaming) {
      releaseInFinally = false;
      return reply.send(sendBodyWithRelease(upstream.body, streamSlot.release));
    }

    return reply.send(upstream.body);
  } catch (error) {
    await logRequest({
      apiKey,
      method: request.method,
      path: request.url,
      modelAlias: model,
      status: 'ERROR',
      statusCode: 504,
      errorCode: error instanceof Error && error.name === 'AbortError' ? 'upstream_timeout' : 'upstream_error',
      estimatedInputTokens,
      latencyMs: Date.now() - startedAt,
      requestId,
    });
    return reply.code(504).send({
      error: {
        message: 'Upstream router request failed',
        type: 'api_error',
      },
    });
  } finally {
    if (releaseInFinally) {
      await streamSlot.release();
    }
  }
});

app.post('/v1/responses', async (request, reply) => {
  const startedAt = Date.now();
  const requestId = request.id;
  const apiKey = await authenticate(request);
  if (!apiKey) {
    return invalidApiKey(reply);
  }

  const parsed = completionBodySchema.safeParse(request.body);
  if (!parsed.success) {
    return reply.code(400).send({
      error: {
        message: 'Invalid request body',
        type: 'invalid_request_error',
        issues: parsed.error.issues,
      },
    });
  }

  const model = getRequestedModel(parsed.data);
  const estimatedInputTokens = estimateInputTokens(parsed.data);
  const access = await enforceAccess(apiKey, model, estimatedInputTokens);
  if (!access.allowed) {
    await logRequest({
      apiKey,
      method: request.method,
      path: request.url,
      modelAlias: model,
      status: access.code === 'daily_quota_exceeded' ? 'QUOTA_EXCEEDED' : 'RATE_LIMITED',
      statusCode: access.statusCode,
      errorCode: access.code,
      estimatedInputTokens,
      latencyMs: Date.now() - startedAt,
      requestId,
    });
    return reply.code(access.statusCode).send({
      error: {
        message: access.message,
        type: 'invalid_request_error',
        code: access.code,
      },
    });
  }

  const streamSlot = isStreamingRequest(parsed.data)
    ? await startStreamSlot(apiKey)
    : { allowed: true, release: async () => undefined };

  if (!streamSlot.allowed) {
    await logRequest({
      apiKey,
      method: request.method,
      path: request.url,
      modelAlias: model,
      status: 'RATE_LIMITED',
      statusCode: 429,
      errorCode: 'concurrent_stream_limit_exceeded',
      estimatedInputTokens,
      latencyMs: Date.now() - startedAt,
      requestId,
    });
    return reply.code(429).send({
      error: {
        message: 'Too many concurrent streams',
        type: 'invalid_request_error',
        code: 'concurrent_stream_limit_exceeded',
      },
    });
  }

  const streaming = isStreamingRequest(parsed.data);
  let releaseInFinally = true;

  try {
    const upstream = await forwardToRouter({
      body: parsed.data,
      path: '/v1/responses',
      routerApiKey: config.routerApiKey,
      routerBaseUrl: config.routerBaseUrl,
      timeoutMs: config.requestTimeoutMs,
    });

    reply.code(upstream.status);
    upstream.headers.forEach((value, key) => {
      if (['content-type', 'cache-control'].includes(key)) {
        reply.header(key, value);
      }
    });

    await logRequest({
      apiKey,
      method: request.method,
      path: request.url,
      modelAlias: model,
      status: upstream.ok ? 'SUCCESS' : 'ERROR',
      statusCode: upstream.status,
      errorCode: upstream.ok ? undefined : 'upstream_error',
      estimatedInputTokens,
      latencyMs: Date.now() - startedAt,
      requestId,
    });

    if (streaming) {
      releaseInFinally = false;
      return reply.send(sendBodyWithRelease(upstream.body, streamSlot.release));
    }

    return reply.send(upstream.body);
  } catch (error) {
    await logRequest({
      apiKey,
      method: request.method,
      path: request.url,
      modelAlias: model,
      status: 'ERROR',
      statusCode: 504,
      errorCode: error instanceof Error && error.name === 'AbortError' ? 'upstream_timeout' : 'upstream_error',
      estimatedInputTokens,
      latencyMs: Date.now() - startedAt,
      requestId,
    });
    return reply.code(504).send({
      error: {
        message: 'Upstream router request failed',
        type: 'api_error',
      },
    });
  } finally {
    if (releaseInFinally) {
      await streamSlot.release();
    }
  }
});

await app.listen({ port: config.port, host: '0.0.0.0' });
