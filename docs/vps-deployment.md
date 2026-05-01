# VPS Deployment Guide

This project deploys with Docker Compose. 9router is installed from npm inside an internal container with a pinned version, not directly on the host.

## Recommended MVP VPS

- Ubuntu 24.04 LTS
- 4 vCPU
- 8 GB RAM
- 100 GB NVMe
- Public IPv4
- Region close to users, e.g. Singapore for Indonesia

## DNS

Point these records to the VPS IP:

- `A yourdomain.com -> VPS_IP`
- `A api.yourdomain.com -> VPS_IP`

## Install server dependencies

```bash
sudo apt update
sudo apt install -y ca-certificates curl git ufw
curl -fsSL https://get.docker.com | sudo sh
sudo usermod -aG docker $USER
```

Log out and log back in so the Docker group applies.

## Firewall

```bash
sudo ufw allow OpenSSH
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw --force enable
```

Only ports 80 and 443 need to be public. PostgreSQL, Redis, and 9router stay internal.

## Deploy

```bash
git clone https://github.com/YOUR_ORG/9router-saas.git
cd 9router-saas
cp .env.production.example .env
```

Edit `.env`:

```bash
nano .env
```

Set:

- `APP_DOMAIN`
- `API_DOMAIN`
- `POSTGRES_PASSWORD`
- `DATABASE_URL`
- `DEMO_API_KEY`
- `ROUTER_API_KEY` if 9router requires an internal API key
- `NINE_ROUTER_VERSION`

Start production:

```bash
docker compose --env-file .env -f docker-compose.prod.yml up -d --build
```

Run database migrations when migrations are added:

```bash
docker compose --env-file .env -f docker-compose.prod.yml exec api npm run db:migrate:deploy --workspace @9router-saas/db
docker compose --env-file .env -f docker-compose.prod.yml exec api npm run db:seed --workspace @9router-saas/db
docker compose --env-file .env -f docker-compose.prod.yml exec api npm run cleanup --workspace @9router-saas/api
```

## Verify

```bash
curl https://api.yourdomain.com/health
curl https://api.yourdomain.com/v1/models \
  -H "Authorization: Bearer $DEMO_API_KEY"
```

Open:

- `https://yourdomain.com`
- `https://api.yourdomain.com/v1/models`

The `/v1/models` endpoint should work before any upstream provider is connected because it returns SaaS model aliases. A real `/v1/chat/completions` call requires at least one active provider credential configured in 9router.

## 9router provider setup

9router is internal, but during initial setup you can temporarily expose or tunnel the dashboard only from a trusted connection.

Safer option:

```bash
ssh -L 20128:9router:20128 root@YOUR_VPS_IP
```

Then open locally:

```txt
http://localhost:20128/dashboard
```

Do not leave the 9router dashboard publicly exposed.

After connecting providers in the 9router dashboard, update the alias mapping in `apps/proxy/src/model-aliases.ts` or move aliases into the database-backed admin panel.

## Updating 9router

Change `NINE_ROUTER_VERSION` in `.env`, then rebuild:

```bash
docker compose --env-file .env -f docker-compose.prod.yml build 9router
docker compose --env-file .env -f docker-compose.prod.yml up -d 9router
```

Pinning the version avoids surprise behavior changes from npm latest.

## Backups

Minimum backup command:

```bash
docker compose --env-file .env -f docker-compose.prod.yml exec postgres \
  pg_dump -U "$POSTGRES_USER" "$POSTGRES_DB" > backup.sql
```

For production, automate daily encrypted backups to S3-compatible storage.

## Logs

```bash
docker compose --env-file .env -f docker-compose.prod.yml logs -f web
docker compose --env-file .env -f docker-compose.prod.yml logs -f api
docker compose --env-file .env -f docker-compose.prod.yml logs -f proxy
docker compose --env-file .env -f docker-compose.prod.yml logs -f 9router
```

## Production notes

- Do not expose 9router directly to users.
- Do not promise unlimited usage.
- Keep API key validation, quota, and rate limiting in the proxy.
- Replace `DEMO_API_KEY` with database-backed hashed API keys before public launch.
- Add monitoring before selling paid subscriptions.
