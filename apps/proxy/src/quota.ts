import { Redis } from 'ioredis';
import { hashApiKey, type AuthenticatedApiKey } from './auth.js';

export const redis = new Redis(process.env.REDIS_URL ?? 'redis://localhost:6379', {
  maxRetriesPerRequest: 2,
});

export async function checkRateLimit(apiKey: AuthenticatedApiKey) {
  const key = `ratelimit:${apiKey.id}:${Math.floor(Date.now() / 60_000)}`;
  const count = await redis.incr(key);

  if (count === 1) {
    await redis.expire(key, 90);
  }

  return {
    allowed: count <= apiKey.plan.requestsPerMinute,
    limit: apiKey.plan.requestsPerMinute,
    remaining: Math.max(apiKey.plan.requestsPerMinute - count, 0),
  };
}

export async function checkDailyLimit(apiKey: AuthenticatedApiKey) {
  const day = new Date().toISOString().slice(0, 10);
  const key = `daily:${apiKey.id}:${day}`;
  const count = await redis.incr(key);

  if (count === 1) {
    await redis.expire(key, 36 * 60 * 60);
  }

  return {
    allowed: count <= apiKey.plan.dailyRequestLimit,
    limit: apiKey.plan.dailyRequestLimit,
    remaining: Math.max(apiKey.plan.dailyRequestLimit - count, 0),
  };
}

export async function startStreamSlot(apiKey: AuthenticatedApiKey) {
  const key = `streams:${apiKey.id}`;
  const count = await redis.incr(key);

  if (count === 1) {
    await redis.expire(key, 10 * 60);
  }

  if (count > apiKey.plan.maxConcurrentStreams) {
    await redis.decr(key);
    return { allowed: false, release: async () => undefined };
  }

  return {
    allowed: true,
    release: async () => {
      await redis.decr(key);
    },
  };
}

export function demoApiKeyFromToken(token: string, demoApiKey: string): AuthenticatedApiKey | null {
  if (token !== demoApiKey) {
    return null;
  }

  return {
    id: `demo:${hashApiKey(token).slice(0, 12)}`,
    userId: 'demo-user',
    prefix: 'ak_live_demo',
    plan: {
      slug: 'trial',
      monthlyTokenQuota: 100_000n,
      dailyRequestLimit: 50,
      requestsPerMinute: 5,
      maxConcurrentStreams: 1,
      allowedModelAliases: ['coding-free'],
    },
  };
}
