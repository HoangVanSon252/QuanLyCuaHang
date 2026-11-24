# ---------- Build giao diện React ----------
FROM node:22-bookworm-slim AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
# Frontend gọi API cùng domain qua Nginx (/api) → không cần CORS, cookie an toàn hơn
ARG VITE_API_URL=/api
ENV VITE_API_URL=${VITE_API_URL}
RUN npm run build

# ---------- Phục vụ file tĩnh + reverse proxy bằng Nginx (không chạy root) ----------
FROM nginxinc/nginx-unprivileged:1.27-alpine
# Giới hạn tốc độ mặc định (ghi đè bằng biến môi trường khi chạy container)
ENV NGINX_API_RATE=50r/s \
    NGINX_API_BURST=100 \
    NGINX_LOGIN_RATE=30r/m
# File mẫu được điền biến môi trường lúc khởi động → /etc/nginx/conf.d/default.conf
COPY nginx/templates/ /etc/nginx/templates/
COPY nginx/snippets/ /etc/nginx/snippets/
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 8080
HEALTHCHECK --interval=15s --timeout=5s --retries=3 CMD wget -qO- http://127.0.0.1:8080/healthz || exit 1
