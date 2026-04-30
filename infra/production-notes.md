# Production Notes

## Recommended MVP VPS

- 4 vCPU
- 8 GB RAM
- 100 GB NVMe
- Ubuntu 24.04 LTS
- Docker + Docker Compose
- Caddy or Nginx for HTTPS reverse proxy

## Public domains

- `https://yourdomain.com` -> `apps/web`
- `https://api.yourdomain.com` -> `apps/proxy`
- `https://admin.yourdomain.com` -> dashboard admin route when added

## Internal-only services

- PostgreSQL
- Redis
- 9router

Do not expose 9router directly to public users. Public traffic must go through the proxy so API keys, quota, rate limits, and request logs are enforced.

## First scale step

Move PostgreSQL to a managed database or a dedicated VPS before adding many paid users. Keep proxy horizontally scalable because AI streaming requests can stay open for a long time.
