#!/usr/bin/env bash
# Khôi phục DB từ một file sao lưu. Chạy trên máy chủ, trong thư mục my-store-app:
#   bash deploy/backup/restore.sh backups/quanlycuahang-20261123-020000.sql.gz
# CẢNH BÁO: ghi đè toàn bộ dữ liệu hiện tại của database.
set -euo pipefail

FILE="${1:?Cách dùng: restore.sh <file.sql.gz>}"
[ -f "$FILE" ] || { echo "Không tìm thấy file $FILE"; exit 1; }

set -a; source ./.env; set +a
DB="${DB_NAME:-quanlycuahang}"

read -r -p "Khôi phục '$FILE' vào database '$DB'? Dữ liệu hiện tại sẽ bị ghi đè. Gõ YES để tiếp tục: " ans
[ "$ans" = "YES" ] || { echo "Đã huỷ."; exit 1; }

echo "Dừng backend để tránh ghi dữ liệu trong lúc khôi phục..."
docker compose stop backend

gunzip -c "$FILE" | docker compose exec -T -e MYSQL_PWD="$MYSQL_ROOT_PASSWORD" db mysql -u root "$DB"

docker compose start backend
echo "✅ Khôi phục xong."
