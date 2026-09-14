FROM ricton-base AS builder

RUN npm run build --workspace=@ricton/user-service

FROM node:20-alpine AS runner

RUN apk add --no-cache curl openssl

WORKDIR /app

ENV NODE_ENV=production

COPY --from=builder /app/package*.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/packages ./packages
COPY --from=builder /app/services/user ./services/user

EXPOSE 3002

HEALTHCHECK --interval=10s --timeout=5s --retries=5 CMD curl -f http://localhost:3002/health || exit 1

CMD ["node", "services/user/dist/index.js"]
