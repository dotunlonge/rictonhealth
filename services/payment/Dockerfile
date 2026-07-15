FROM node:20-alpine AS builder

# Install OpenSSL for Prisma
RUN apk add --no-cache openssl

WORKDIR /app

# Copy root configurations
COPY package*.json ./
COPY tsconfig*.json ./

# Copy workspaces (Only shared, db, auth-middleware, and the target service)
COPY packages/ ./packages/
COPY services/payment/ ./services/payment/

# Install dependencies (workspaces handled automatically)
RUN npm ci

# Generate Prisma Client
RUN npm run generate --workspace=@ricton/db

# Build the dependent packages and the payment service
RUN npm run build --workspace=@ricton/shared --workspace=@ricton/db --workspace=@ricton/auth-middleware
RUN npm run build --workspace=@ricton/payment-service

# --- Runner Stage ---
FROM node:20-alpine AS runner

RUN apk add --no-cache openssl

WORKDIR /app

ENV NODE_ENV=production

# Copy necessary files from builder
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/packages ./packages
COPY --from=builder /app/services/payment ./services/payment

EXPOSE 3004

CMD ["node", "services/payment/dist/src/index.js"]
