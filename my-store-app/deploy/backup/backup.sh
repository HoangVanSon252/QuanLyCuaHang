#!/usr/bin/env bash
# Sao lưu MySQL định kỳ (chạy trong container "backup").
# File: /backups/<db>-YYYYmmdd-HHMMSS.sql.gz — tự xoá bản cũ hơn BACKUP_RETENTION_DAYS ngày.
set -euo pipefail

INTERVAL_HOURS="${BACKUP_INTERVAL_HOURS:-24}"
RETENTION_DAYS="${BACKUP_RETENTION_DAYS:-14}"

run_backup() {
  local ts file tmp
  ts="$(date +%Y%m%d-%H%M%S)"
  file="/backups/${MYSQL_DATABASE}-${ts}.sql.gz"
  tmp="${file}.partial"
  echo "[backup] $(date -Iseconds) bắt đầu sao lưu → ${file}"
  if mysqldump -h "${MYSQL_HOST}" -u root \
      --single-transaction --quick --routines --triggers --events \
      --set-gtid-purged=OFF --no-tablespaces "${MYSQL_DATABASE}" | gzip -9 > "${tmp}"; then
    mv "${tmp}" "${file}"
    echo "[backup] xong ($(du -h "${file}" | cut -f1))"
  else
    rm -f "${tmp}"
    echo "[backup] THẤT BẠI" >&2
  fi
  find /backups -name "${MYSQL_DATABASE}-*.sql.gz" -mtime +"${RETENTION_DAYS}" -print -delete || true
}

# Chờ DB sẵn sàng rồi sao lưu ngay một lần, sau đó lặp theo chu kỳ
until mysqladmin ping -h "${MYSQL_HOST}" -u root --silent; do sleep 5; done
while true; do
  run_backup
  sleep "$((INTERVAL_HOURS * 3600))"
done
