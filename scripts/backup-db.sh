#!/usr/bin/env bash
# Nightly PostgreSQL backup with rotation.
# Designed to run on the VPS via cron, against the local Postgres.
#
# Usage:
#   ./backup-db.sh
#
# Configuration via environment variables (all optional):
#   PGDATABASE      database name (default: crm_db)
#   PGUSER          db user (default: postgres)
#   PGHOST          db host (default: localhost)
#   PGPORT          db port (default: 5432)
#   BACKUP_DIR      destination directory (default: /var/backups/ktoptima)
#   KEEP_DAYS       how many daily backups to keep (default: 14)
#   ALERT_EMAIL_TO  if set + `mail` available, sends alerts on failure
#
# Restore example:
#   gunzip -c backup-2026-05-07.sql.gz | psql -U postgres -d crm_db

set -euo pipefail

PGDATABASE="${PGDATABASE:-crm_db}"
PGUSER="${PGUSER:-postgres}"
PGHOST="${PGHOST:-localhost}"
PGPORT="${PGPORT:-5432}"
BACKUP_DIR="${BACKUP_DIR:-/var/backups/ktoptima}"
KEEP_DAYS="${KEEP_DAYS:-14}"
ALERT_EMAIL_TO="${ALERT_EMAIL_TO:-}"

ts="$(date +%F_%H-%M-%S)"
day_stamp="$(date +%F)"
log_file="${BACKUP_DIR}/backup.log"
out_file="${BACKUP_DIR}/${PGDATABASE}-${day_stamp}.sql.gz"

mkdir -p "$BACKUP_DIR"
chmod 700 "$BACKUP_DIR"

log() {
  echo "[$(date -Iseconds)] $*" | tee -a "$log_file"
}

alert() {
  local subject="$1"
  local body="$2"
  log "$subject - $body"
  if [ -n "$ALERT_EMAIL_TO" ] && command -v mail >/dev/null 2>&1; then
    printf '%s\n' "$body" | mail -s "$subject" "$ALERT_EMAIL_TO" || true
  fi
}

trap 'alert "[ktOptima] BACKUP FAILED" "Voir $log_file pour les détails (ts=$ts)."' ERR

log "=== Starting backup for $PGDATABASE ==="
PGPASSWORD="${PGPASSWORD:-}" pg_dump \
  -h "$PGHOST" -p "$PGPORT" -U "$PGUSER" \
  --format=plain --no-owner --no-privileges \
  "$PGDATABASE" \
  | gzip -9 > "$out_file"

size_human="$(du -h "$out_file" | cut -f1)"
log "Backup OK: $out_file ($size_human)"

log "=== Rotating backups older than ${KEEP_DAYS} days ==="
find "$BACKUP_DIR" -maxdepth 1 -name "${PGDATABASE}-*.sql.gz" -mtime "+${KEEP_DAYS}" -print -delete \
  | tee -a "$log_file" || true

log "=== Backup done ==="
