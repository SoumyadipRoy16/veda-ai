# Multi-stage build for optimized production image
FROM node:18-alpine AS builder

WORKDIR /app

# Copy root package files
COPY package*.json ./
COPY tsconfig.base.json ./

# Copy workspace packages
COPY packages ./packages
COPY apps/worker ./apps/worker

# Install dependencies
RUN npm ci

# Build worker
RUN npm run build --workspace @veda-ai/worker

# Production image
FROM node:18-alpine

WORKDIR /app

# Install dumb-init for proper signal handling
RUN apk add --no-cache dumb-init

# Copy root package files
COPY package*.json ./
COPY tsconfig.base.json ./

# Copy workspace packages (shared)
COPY packages ./packages
COPY apps/worker ./apps/worker

# Install production dependencies only
RUN npm ci --omit=dev

# Copy compiled code from builder
COPY --from=builder /app/apps/worker/dist ./apps/worker/dist

# Create non-root user for security
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

USER nodejs

# No health check needed for worker (background process)

# Start worker
CMD ["node", "apps/worker/dist/index.js"]
