import cors from '@fastify/cors';
import rateLimit from '@fastify/rate-limit';
import Fastify from 'fastify';
import { authenticateApiKey, getBearerToken } from './auth.js';
import { loadConfig } from './config.js';
import { listModelAliases } from './model-aliases.js';
import { forwardToRouter } from './router-client.js';

const config = loadConfig();
const app = Fastify({ logger: true });

await app.register(cors, { origin: true });
await app.register(rateLimit, {
  max: 60,
  timeWindow: '1 minute',
});

app.get('/health', async () => ({
  ok: true,
  service: 'proxy',
  timestamp: new Date().toISOString(),
}));

app.get('/v1/models', async (request, reply) => {
  const apiKey = authenticateApiKey(getBearerToken(request), config.demoApiKey);
  if (!apiKey) {
    return reply.code(401).send({
      error: {
        message: 'Invalid API key',
        type: 'invalid_request_error',
      },
    });
  }

  return {
    object: 'list',
    data: listModelAliases(),
  };
});

app.post('/v1/chat/completions', async (request, reply) => {
  const apiKey = authenticateApiKey(getBearerToken(request), config.demoApiKey);
  if (!apiKey) {
    return reply.code(401).send({
      error: {
        message: 'Invalid API key',
        type: 'invalid_request_error',
      },
    });
  }

  const upstream = await forwardToRouter({
    body: request.body,
    headers: {
      authorization: request.headers.authorization,
    },
    path: '/v1/chat/completions',
    routerBaseUrl: config.routerBaseUrl,
  });

  reply.code(upstream.status);
  upstream.headers.forEach((value, key) => {
    if (!['content-encoding', 'content-length', 'transfer-encoding'].includes(key)) {
      reply.header(key, value);
    }
  });

  return reply.send(upstream.body);
});

app.post('/v1/responses', async (request, reply) => {
  const apiKey = authenticateApiKey(getBearerToken(request), config.demoApiKey);
  if (!apiKey) {
    return reply.code(401).send({
      error: {
        message: 'Invalid API key',
        type: 'invalid_request_error',
      },
    });
  }

  const upstream = await forwardToRouter({
    body: request.body,
    headers: {
      authorization: request.headers.authorization,
    },
    path: '/v1/responses',
    routerBaseUrl: config.routerBaseUrl,
  });

  reply.code(upstream.status);
  upstream.headers.forEach((value, key) => {
    if (!['content-encoding', 'content-length', 'transfer-encoding'].includes(key)) {
      reply.header(key, value);
    }
  });

  return reply.send(upstream.body);
});

await app.listen({ port: config.port, host: '0.0.0.0' });
