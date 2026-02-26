# ─── Stage 1: Builder ────────────────────────────────────────────────────────
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files first (Docker layer caching)
COPY package*.json ./

# Install all dependencies (including dev)
RUN npm ci

# Copy source code
COPY . .

# ─── Stage 2: Production ──────────────────────────────────────────────────────
FROM node:20-alpine AS production

# Install security updates
RUN apk add --no-cache dumb-init

# Create non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

WORKDIR /app

# Copy package files and install ONLY production deps
COPY package*.json ./
RUN npm ci --omit=dev && npm cache clean --force

# Copy built app from builder
COPY --from=builder --chown=nodejs:nodejs /app .

# Create logs directory
RUN mkdir -p logs && chown -R nodejs:nodejs logs

# Switch to non-root user
USER nodejs

# Expose port
EXPOSE 8080

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD node -e "require('http').get('http://localhost:8080/health', (res) => { process.exit(res.statusCode === 200 ? 0 : 1) })" || exit 1

# Use dumb-init for proper signal handling in containers
ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "server.js"]