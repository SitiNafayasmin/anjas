# Production Readiness Checklist

Use this before opening the service to public users.

## Must be configured before launch

- Point `APP_DOMAIN` and `API_DOMAIN` DNS to the VPS.
- Set a long random `POSTGRES_PASSWORD`.
- Set `AUTH_SESSION_SECRET` to at least 32 random bytes.
- Set `DEMO_API_KEY` to a long random temporary key or disable demo traffic after real users are onboarded.
- Configure providers inside internal 9router, then verify `/v1/chat/completions` returns real model output.
- Set `PAYMENT_GATEWAY_API_KEY` before enabling paid checkout.
- Set `PAYMENT_WEBHOOK_SECRET` when the payment provider signature/secret issue is fixed. Empty secret is supported only as temporary degraded mode.

## Deploy sequence

```bash
docker compose --env-file .env -f docker-compose.prod.yml up -d --build
docker compose --env-file .env -f docker-compose.prod.yml exec api npm run db:migrate:deploy --workspace @9router-saas/db
docker compose --env-file .env -f docker-compose.prod.yml exec api npm run db:seed --workspace @9router-saas/db
docker compose --env-file .env -f docker-compose.prod.yml --profile smoke run --rm smoke
```

## User-facing readiness

- Register/login form is wired to `/auth/register` and `/auth/login`.
- Dashboard can create, list, and revoke API keys.
- Dashboard shows usage summary and recent request logs.
- Docs page must be updated with the final production API domain before sharing publicly.

## Ops checklist

- Enable automated PostgreSQL backups to external storage.
- Add uptime monitoring for web, API `/health`, proxy `/health`, and Caddy.
- Add log retention for `RequestLog` metadata; recommended 30-90 days.
- Keep prompt/body logging disabled by default.
- Monitor Redis memory and Postgres disk usage.
- Rotate provider/payment/API secrets if they are shared during setup.

## Still recommended after MVP launch

- Email verification.
- Password reset.
- Admin panel for user suspension and manual quota management.
- 2FA for admin accounts.
- CI/CD deploy workflow.
- Real provider cost tracking.
