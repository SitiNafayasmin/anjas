import { resolveModelAlias } from './model-aliases.js';

type ForwardOptions = {
  body: unknown;
  headers: Record<string, string | undefined>;
  path: string;
  routerBaseUrl: string;
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

  headers.set('content-type', 'application/json');
  const authorization = options.headers.authorization;
  if (authorization) {
    headers.set('authorization', authorization);
  }

  return fetch(targetUrl, {
    method: 'POST',
    headers,
    body: JSON.stringify(rewriteBody(options.body)),
  });
}
