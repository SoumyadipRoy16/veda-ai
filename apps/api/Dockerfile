# Multi-stage build for optimized production image
FROM node:18-alpine AS builder

WORKDIR /app

# Copy root package files
COPY package*.json ./
COPY tsconfig.base.json ./

# Copy workspace packages
COPY packages ./packages
COPY apps/api ./apps/api

# Install dependencies
RUN npm ci

# Build API
RUN npm run build --workspace @veda-ai/api

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
COPY apps/api ./apps/api

# Install production dependencies only
RUN npm ci --omit=dev

# Copy compiled code from builder
COPY --from=builder /app/apps/api/dist ./apps/api/dist

# Create non-root user for security
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

USER nodejs

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD node -e "require('http').get('http://localhost:' + (process.env.PORT || 4001) + '/api/health', (r) => {if (r.statusCode !== 200) throw new Error(r.statusCode)})"

# Expose port
EXPOSE 4001

# Use dumb-init to handle signals properly
ENTRYPOINT ["dumb-init", "--"]

# Start server
CMD ["node", "apps/api/dist/index.js"]
