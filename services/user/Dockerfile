FROM node:20-alpine AS builder

# Install OpenSSL for Prisma
RUN apk add --no-cache openssl

WORKDIR /app

# Copy root configurations
COPY package*.json ./
COPY tsconfig*.json ./

# Copy workspaces (Only shared, db, auth-middleware, and the target service)
COPY packages/ ./packages/
COPY services/user/ ./services/user/

# Install dependencies (workspaces handled automatically)
RUN npm ci

# Generate Prisma Client
RUN npm run generate --workspace=@ricton/db

# Build the dependent packages and the user service
RUN npm run build --workspace=@ricton/shared --workspace=@ricton/db --workspace=@ricton/auth-middleware
RUN npm run build --workspace=@ricton/user-service

# --- Runner Stage ---
FROM node:20-alpine AS runner

RUN apk add --no-cache openssl

WORKDIR /app

ENV NODE_ENV=production

# Copy necessary files from builder
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/packages ./packages
COPY --from=builder /app/services/user ./services/user

EXPOSE 3002

CMD ["node", "services/user/dist/src/index.js"]
