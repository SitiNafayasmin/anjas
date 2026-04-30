import type { FastifyRequest } from 'fastify';

export type AuthenticatedApiKey = {
  id: string;
  userId: string;
  prefix: string;
  plan: 'trial' | 'pro';
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
    plan: 'trial',
  };
}
