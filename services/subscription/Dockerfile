FROM node:20-alpine

WORKDIR /app

# Install dependencies - copy root package files first for workspace resolution
COPY ../../package*.json ./
COPY ../../packages ./packages
COPY ./package*.json ./services/subscription/
COPY ./services/subscription ./services/subscription

RUN npm install

# Build TypeScript
RUN npm run build

# Expose port
EXPOSE 3009

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:${PORT_SUBSCRIPTION:-3009}/health || exit 1

# Start service
CMD ["npm", "start"]
