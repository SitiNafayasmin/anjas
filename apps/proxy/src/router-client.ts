import { resolveModelAlias } from './model-aliases.js';

type ForwardOptions = {
  body: unknown;
  path: string;
  routerApiKey: string | undefined;
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
  if (options.routerApiKey) {
    headers.set('authorization', `Bearer ${options.routerApiKey}`);
  }

  return fetch(targetUrl, {
    method: 'POST',
    headers,
    body: JSON.stringify(rewriteBody(options.body)),
  });
}
