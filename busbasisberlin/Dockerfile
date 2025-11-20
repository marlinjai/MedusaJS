# Medusa Backend Dockerfile
# Multi-stage build for production optimization
# Based on official Medusa Docker recommendations

# Build stage
FROM node:20-alpine AS builder

# Set working directory (following official Medusa recommendation)
WORKDIR /server

# Install dependencies for native modules
RUN apk add --no-cache python3 make g++

# Copy package files (using npm - standardized package manager)
COPY package.json package-lock.json* ./

# Install dependencies with BuildKit cache mount (optimized for speed)
# Using npm ci instead of npm install: faster, more reliable, deterministic
# Cache mount persists npm packages between builds, saving ~8 minutes
RUN --mount=type=cache,target=/root/.npm \
    npm ci --prefer-offline --no-audit

# Copy source code
COPY . .

# Build the application
RUN npx medusa build

# Production stage
FROM node:20-alpine AS production

# Create app user for security
RUN addgroup -g 1001 -S nodejs
RUN adduser -S medusa -u 1001

# Set working directory (following official Medusa recommendation)
WORKDIR /server

# Install required packages for health checks, database connection, and Puppeteer
# Chromium and dependencies needed for PDF generation
# Combined into single RUN to reduce layers and improve caching
RUN apk update && apk add --no-cache \
    curl \
    postgresql-client \
    chromium \
    nss \
    freetype \
    harfbuzz \
    ca-certificates \
    ttf-freefont \
    font-noto-emoji \
    net-tools \
    procps \
    && rm -rf /var/cache/apk/*

# Tell Puppeteer to use the installed Chromium
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true

# Copy built application from builder stage (following official Medusa docs)
COPY --from=builder /server/.medusa ./.medusa

# Copy only necessary files for production
COPY --from=builder /server/package.json ./
COPY --from=builder /server/start.sh ./

# Copy source scripts for medusa exec commands (needed for admin scripts)
COPY --from=builder /server/src ./src

# Change to the built application directory (official Medusa recommendation)
WORKDIR /server/.medusa/server

# Install production dependencies only with BuildKit cache mount (optimized)
# Using npm ci for faster, deterministic installs
# Cache mount persists npm packages between builds, saving ~1-2 minutes
RUN --mount=type=cache,target=/root/.npm \
    npm ci --production --prefer-offline --no-audit

# Copy startup script to the built directory and make it executable
# (Copy from /server since we're now in /server/.medusa/server)
RUN cp /server/start.sh ./start.sh && chmod +x ./start.sh

# Change ownership to app user
RUN chown -R medusa:nodejs /server

# Switch to app user
USER medusa

# Set environment (will be overridden by docker-compose env vars)
ENV NODE_ENV=${NODE_ENV:-production}

# Expose port (will be overridden by docker-compose PORT env var)
EXPOSE 9000 9001 9002 9003

# Health check (uses PORT environment variable, defaults to 9000)
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:${PORT:-9000}/health || exit 1

# Start the application with migrations (following official Medusa approach)
CMD ["./start.sh"]