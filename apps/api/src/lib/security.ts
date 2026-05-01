import { HttpException, HttpStatus } from '@nestjs/common';

type RateLimitBucket = {
  count: number;
  resetAt: number;
};

const memoryBuckets = new Map<string, RateLimitBucket>();

function getClientIp(request: {
  headers: Record<string, string | string[] | undefined>;
  ip?: string;
}) {
  const forwardedFor = request.headers['x-forwarded-for'];
  const raw = Array.isArray(forwardedFor) ? forwardedFor[0] : forwardedFor;

  if (raw) {
    return raw.split(',')[0]?.trim() ?? 'unknown';
  }

  return request.ip ?? 'unknown';
}

export function getRequestFingerprint(
  request: {
    headers: Record<string, string | string[] | undefined>;
    ip?: string;
  },
  email?: string,
) {
  return `${getClientIp(request)}:${email?.toLowerCase() ?? 'anonymous'}`;
}

export function assertRateLimit(input: {
  key: string;
  limit: number;
  windowSeconds: number;
}) {
  const now = Date.now();
  const resetAt = now + input.windowSeconds * 1000;
  const existing = memoryBuckets.get(input.key);

  if (!existing || existing.resetAt <= now) {
    memoryBuckets.set(input.key, { count: 1, resetAt });
    return;
  }

  existing.count += 1;

  if (existing.count > input.limit) {
    throw new HttpException('Too many attempts. Please wait before trying again.', HttpStatus.TOO_MANY_REQUESTS);
  }
}
