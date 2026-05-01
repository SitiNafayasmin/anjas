# Monitoring and Backup Runbook

Use this before opening public beta traffic.

## Uptime checks

Create checks for:

- `https://yourdomain.com`
- `https://api.yourdomain.com/health`
- `https://api.yourdomain.com/v1/models` with a real smoke API key
- VPS disk usage, CPU, memory, Docker container restart count

Recommended alert thresholds:

- API health down for 2 minutes
- proxy `/v1/models` failing for 2 minutes
- Postgres disk > 75%
- Redis memory > 75%
- 5xx rate > 2% in 5 minutes
- p95 latency > 20 seconds for chat completion

## Backups

Create a daily cron on the VPS:

```bash
0 2 * * * cd /opt/9router-saas && BACKUP_DIR=/var/backups/9router ./scripts/backup-postgres.sh >> /var/log/9router-backup.log 2>&1
```

Copy backups to external storage. Local disk-only backup is not enough.

Restore drill:

```bash
cd /opt/9router-saas
./scripts/restore-postgres.sh /var/backups/9router/9router-postgres-YYYYMMDDTHHMMSSZ.sql.gz
```

## Retention

Run cleanup daily:

```bash
docker compose --env-file .env -f docker-compose.prod.yml exec api npm run cleanup --workspace @9router-saas/api
```

Default `REQUEST_LOG_RETENTION_DAYS=90`. Lower this to 30 days if disk grows quickly.

## Incident response

1. Check Caddy, web, API, proxy, postgres, redis, and 9router containers.
2. Check `/status` for configured external dependencies.
3. Disable broken providers in admin provider ops.
4. Suspend abusive users in `/admin`.
5. Rotate leaked provider/payment/API secrets.
