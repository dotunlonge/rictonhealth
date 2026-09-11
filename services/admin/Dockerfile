FROM ricton-base AS builder

RUN npm run build --workspace=@ricton/admin-service

FROM node:20-alpine AS runner

RUN apk add --no-cache curl

WORKDIR /app

ENV NODE_ENV=production

COPY --from=builder /app/package*.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/packages ./packages
COPY --from=builder /app/services/admin ./services/admin

EXPOSE 3010

HEALTHCHECK --interval=10s --timeout=5s --retries=5 CMD curl -f http://localhost:3010/health || exit 1

CMD ["node", "services/admin/dist/index.js"]
