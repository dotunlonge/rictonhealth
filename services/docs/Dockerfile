FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
COPY tsconfig*.json ./
COPY services/docs/package*.json ./services/docs/
RUN npm ci --workspace=@ricton/docs --ignore-scripts

COPY services/docs ./services/docs
COPY tsconfig*.json ./

RUN npm run build --workspace=@ricton/docs

FROM node:20-alpine AS runner
WORKDIR /app
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/services/docs/dist ./services/docs/dist
COPY --from=builder /app/services/docs/package*.json ./services/docs/
# openapi.yaml will be mounted or generated in the root
EXPOSE 3003
CMD ["node", "services/docs/dist/index.js"]
