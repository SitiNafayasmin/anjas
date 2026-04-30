import type { FastifyRequest } from 'fastify';
import { createHash } from 'node:crypto';

export type AuthenticatedApiKey = {
  id: string;
  userId: string;
  prefix: string;
  plan: {
    slug: string;
    monthlyTokenQuota: bigint;
    dailyRequestLimit: number;
    requestsPerMinute: number;
    maxConcurrentStreams: number;
    allowedModelAliases: string[];
  };
};

export function getBearerToken(request: FastifyRequest): string | null {
  const authorization = request.headers.authorization;
  if (!authorization?.startsWith('Bearer ')) {
    return null;
  }

  return authorization.slice('Bearer '.length).trim();
}

export function authenticateApiKey(
  token: string | null,
  demoApiKey: string,
): AuthenticatedApiKey | null {
  if (token !== demoApiKey) {
    return null;
  }

  return {
    id: 'demo',
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

export function hashApiKey(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}
