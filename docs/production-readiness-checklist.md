# Production Readiness Checklist

Use this before opening the service to public users.

## Must be configured before launch

- Point `APP_DOMAIN` and `API_DOMAIN` DNS to the VPS.
- Set a long random `POSTGRES_PASSWORD`.
- Set `AUTH_SESSION_SECRET` to at least 32 random bytes.
- Set `DEMO_API_KEY` to a long random temporary key or disable demo traffic after real users are onboarded.
- Set `APP_PUBLIC_URL`, `BREVO_API_KEY`, `EMAIL_FROM`, and `EMAIL_FROM_NAME` before requiring email verification in production.
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
- Dashboard blocks API key creation until email is verified.
- Dashboard shows usage summary and recent request logs.
- Dashboard includes billing history, QRIS checkout creation, subscription cancel, and admin overview for admins.
- Docs page must be updated with the final production API domain before sharing publicly.

## Ops checklist

- Enable automated PostgreSQL backups to external storage.
- Configure `scripts/backup-postgres.sh` as a daily cron and test `scripts/restore-postgres.sh`.
- Add uptime monitoring for web, API `/health`, proxy `/health`, and Caddy.
- Use `scripts/healthcheck-prod.sh` for external smoke checks.
- Add log retention for `RequestLog` metadata; recommended 30-90 days.
- Keep prompt/body logging disabled by default.
- Monitor Redis memory and Postgres disk usage.
- Rotate provider/payment/API secrets if they are shared during setup.
- Run cleanup regularly:
  ```bash
  docker compose --env-file .env -f docker-compose.prod.yml exec api npm run cleanup --workspace @9router-saas/api
  ```

## Still recommended after MVP launch

- Full visual admin panel for all admin endpoints.
- 2FA for admin accounts.
- CI/CD deploy workflow.
- Real provider cost tracking.
