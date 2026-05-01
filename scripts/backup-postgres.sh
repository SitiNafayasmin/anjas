#!/usr/bin/env bash
set -euo pipefail

BACKUP_DIR="${BACKUP_DIR:-/home/ubuntu/9router-backups}"
COMPOSE_FILE="${COMPOSE_FILE:-docker-compose.prod.yml}"
ENV_FILE="${ENV_FILE:-.env}"
RETENTION_DAYS="${BACKUP_RETENTION_DAYS:-14}"
TIMESTAMP="$(date -u +%Y%m%dT%H%M%SZ)"
OUTPUT_FILE="${BACKUP_DIR}/9router-postgres-${TIMESTAMP}.sql.gz"

mkdir -p "${BACKUP_DIR}"

docker compose --env-file "${ENV_FILE}" -f "${COMPOSE_FILE}" exec -T postgres \
  pg_dump -U "${POSTGRES_USER:-9router_saas}" "${POSTGRES_DB:-9router_saas}" | gzip > "${OUTPUT_FILE}"

find "${BACKUP_DIR}" -name '9router-postgres-*.sql.gz' -mtime "+${RETENTION_DAYS}" -delete

echo "${OUTPUT_FILE}"
