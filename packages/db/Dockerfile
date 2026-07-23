FROM node:20-alpine AS builder

RUN apk add --no-cache openssl curl

WORKDIR /app

COPY package*.json ./
COPY tsconfig*.json ./

COPY packages/ ./packages/

RUN npm ci

RUN npm run generate --workspace=@ricton/db

FROM node:20-alpine AS runner

RUN apk add --no-cache curl

WORKDIR /app/packages/db

ENV NODE_ENV=production

COPY --from=builder /app/package*.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/packages/db ./packages/db

CMD ["npx", "prisma", "migrate", "deploy"]
