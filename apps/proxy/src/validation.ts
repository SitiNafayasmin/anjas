import { z } from 'zod';

const messageSchema = z.object({
  role: z.string().min(1),
  content: z.unknown(),
});

export const completionBodySchema = z
  .object({
    model: z.string().min(1).max(120),
    messages: z.array(messageSchema).optional(),
    input: z.unknown().optional(),
    stream: z.boolean().optional(),
    max_tokens: z.number().int().positive().max(8192).optional(),
  })
  .passthrough();

export function getRequestedModel(body: unknown): string | undefined {
  if (!body || typeof body !== 'object') {
    return undefined;
  }

  const model = (body as { model?: unknown }).model;
  return typeof model === 'string' ? model : undefined;
}

export function isStreamingRequest(body: unknown): boolean {
  if (!body || typeof body !== 'object') {
    return false;
  }

  return (body as { stream?: unknown }).stream === true;
}

export function estimateInputTokens(body: unknown): number {
  return Math.max(1, Math.ceil(JSON.stringify(body).length / 4));
}
