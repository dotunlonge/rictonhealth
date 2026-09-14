FROM node:22-alpine AS builder

RUN apk add --no-cache openssl

WORKDIR /app

COPY package*.json ./
COPY tsconfig*.json ./
COPY packages/ ./packages/
COPY apps/web/ ./apps/web/

RUN npm ci

# Prisma client is not in the registry tarball: generate it before type-checking.
# (Service images inherit this via Dockerfile.base; the standalone web image needs it too.)
RUN npm run generate --workspace=@ricton/db

ARG NEXT_PUBLIC_API_URL
ARG NEXT_PUBLIC_GOOGLE_CLIENT_ID
ARG NEXT_PUBLIC_APPLE_CLIENT_ID
ARG DEPLOYMENT_VERSION
ENV NEXT_PUBLIC_API_URL=${NEXT_PUBLIC_API_URL}
ENV NEXT_PUBLIC_GOOGLE_CLIENT_ID=${NEXT_PUBLIC_GOOGLE_CLIENT_ID}
ENV NEXT_PUBLIC_APPLE_CLIENT_ID=${NEXT_PUBLIC_APPLE_CLIENT_ID}
ENV DEPLOYMENT_VERSION=${DEPLOYMENT_VERSION}

RUN test -n "$NEXT_PUBLIC_API_URL"
RUN test -n "$NEXT_PUBLIC_GOOGLE_CLIENT_ID"
RUN npm --workspace=web run build

FROM node:22-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV HOSTNAME=0.0.0.0
ENV PORT=3000

RUN addgroup --system --gid 1001 nodejs && adduser --system --uid 1001 nextjs

COPY --from=builder --chown=nextjs:nodejs /app/apps/web/public ./apps/web/public
COPY --from=builder --chown=nextjs:nodejs /app/apps/web/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/apps/web/.next/static ./apps/web/.next/static

USER nextjs

EXPOSE 3000

HEALTHCHECK --interval=10s --timeout=5s --retries=5 CMD wget -q -O /dev/null http://localhost:3000/ || exit 1

CMD ["node", "apps/web/server.js"]
