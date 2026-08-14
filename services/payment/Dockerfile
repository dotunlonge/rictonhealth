FROM node:20-alpine AS builder

RUN apk add --no-cache openssl curl

WORKDIR /app

COPY package*.json ./
COPY tsconfig*.json ./

COPY packages/ ./packages/
COPY services/payment/ ./services/payment/

RUN npm install

RUN npm run generate --workspace=@ricton/db

RUN npm run build --workspace=@ricton/shared --workspace=@ricton/db --workspace=@ricton/auth-middleware
RUN npm run build --workspace=@ricton/payment-service

FROM node:20-alpine AS runner

RUN apk add --no-cache curl

WORKDIR /app

ENV NODE_ENV=production

COPY --from=builder /app/package*.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/packages ./packages
COPY --from=builder /app/services/payment ./services/payment

EXPOSE 3007

HEALTHCHECK --interval=10s --timeout=5s --retries=5   CMD curl -f http://localhost:3007/health || exit 1

CMD ["node", "services/payment/dist/src/index.js"]
