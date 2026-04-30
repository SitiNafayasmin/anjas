# 9router SaaS

Starter monorepo for selling managed AI coding API keys backed by an internal 9router service.

Payment is intentionally not included yet. The initial product focuses on users, API keys, model aliases, proxying, quota/rate-limit foundations, and usage logging foundations.

## Stack

- `apps/web`: Next.js dashboard and public website
- `apps/api`: NestJS business API
- `apps/proxy`: Fastify OpenAI-compatible API gateway
- `packages/db`: Prisma schema and database client
- PostgreSQL for persistent data
- Redis for rate limits, counters, and future queues
- 9router as an internal AI routing service

## Local setup

```bash
cp .env.example .env
npm install
npm run db:generate
npm run infra:up
```

Run services:

```bash
npm run dev:web
npm run dev:api
npm run dev:proxy
```

Default URLs:

- Web: `http://localhost:3000`
- Business API: `http://localhost:4000`
- Public AI proxy: `http://localhost:4100/v1`
- 9router dashboard: `http://localhost:20128/dashboard`

## Demo API key

The proxy accepts this demo key from `.env.example`:

```txt
ak_live_demo
```

Example:

```bash
curl http://localhost:4100/v1/models \
  -H "Authorization: Bearer ak_live_demo"
```

## Model aliases

Initial public aliases:

- `coding-free`
- `coding-fast`
- `coding-cheap`
- `coding-smart`

These are currently mapped in `apps/proxy/src/model-aliases.ts`. Move them into the database-backed `ModelAlias` table when the admin panel is implemented.

## 9router integration

Users should never call 9router directly in production.

Public clients call:

```txt
https://api.yourdomain.com/v1
```

The proxy validates the user API key, applies quota/rate limits, resolves model aliases, and forwards to internal 9router:

```txt
http://9router:20128/v1
```

## Next implementation steps

- Replace demo API key auth with database-backed hashed API keys.
- Add Better Auth or another auth provider.
- Add Redis-backed quota and rate-limit rules per plan.
- Persist usage events and request logs.
- Add admin UI for plans, users, model aliases, and provider health.
- Integrate the separate payment project later through webhooks.
