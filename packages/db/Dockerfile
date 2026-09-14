FROM node:20-alpine AS builder

RUN apk add --no-cache openssl openssl-dev curl

WORKDIR /app

COPY package*.json ./
COPY tsconfig*.json ./

COPY packages/db ./packages/db

RUN npm ci --workspace=@ricton/db --include-workspace-root

RUN npm run generate --workspace=@ricton/db

FROM node:20-alpine AS runner

RUN apk add --no-cache curl openssl

WORKDIR /app

ENV NODE_ENV=production

COPY --from=builder /app/package*.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/packages/db ./packages/db

CMD ["npx", "prisma", "migrate", "deploy", "--schema=packages/db/prisma/schema.prisma"]
