import { resolveModelAlias } from './model-aliases.js';

type ForwardOptions = {
  body: unknown;
  path: string;
  routerApiKey: string | undefined;
  routerBaseUrl: string;
  timeoutMs: number;
};

type ChatBody = {
  model?: string;
  [key: string]: unknown;
};

function rewriteBody(body: unknown): unknown {
  if (!body || typeof body !== 'object') {
    return body;
  }

  const chatBody = body as ChatBody;
  return {
    ...chatBody,
    model: resolveModelAlias(chatBody.model),
  };
}

export async function forwardToRouter(options: ForwardOptions): Promise<Response> {
  const targetUrl = new URL(options.path, options.routerBaseUrl);
  const headers = new Headers();
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), options.timeoutMs);

  headers.set('content-type', 'application/json');
  if (options.routerApiKey) {
    headers.set('authorization', `Bearer ${options.routerApiKey}`);
  }

  try {
    return await fetch(targetUrl, {
      method: 'POST',
      headers,
      signal: controller.signal,
      body: JSON.stringify(rewriteBody(options.body)),
    });
  } finally {
    clearTimeout(timeout);
  }
}
