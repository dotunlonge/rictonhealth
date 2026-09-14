FROM ricton-base AS builder

RUN npm run build --workspace=@ricton/messaging-service

FROM node:20-alpine AS runner

RUN apk add --no-cache curl openssl

WORKDIR /app

ENV NODE_ENV=production

COPY --from=builder /app/package*.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/packages ./packages
COPY --from=builder /app/services/messaging ./services/messaging

EXPOSE 3012

HEALTHCHECK --interval=10s --timeout=5s --retries=5 CMD curl -f http://localhost:3012/health || exit 1

CMD ["node", "services/messaging/dist/index.js"]
