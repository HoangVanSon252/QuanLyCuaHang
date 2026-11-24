# ---------- Cài dependency production ----------
FROM node:22-bookworm-slim AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --omit=dev && npm cache clean --force

# ---------- Image chạy thực tế ----------
FROM node:22-bookworm-slim
ENV NODE_ENV=production
WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY --chown=node:node . .

# Chạy bằng user không có quyền root
USER node
EXPOSE 8080

HEALTHCHECK --interval=15s --timeout=5s --start-period=20s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:8080/api/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

# Tạo Super Admin lần đầu (bỏ qua nếu đã có) rồi khởi động API
CMD ["sh", "-c", "node createAdmin.js && exec node server.js"]
