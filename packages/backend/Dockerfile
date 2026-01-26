# Stage 1: Builder
FROM node:22-alpine AS builder

WORKDIR /app

# Install pnpm globally
RUN npm install -g pnpm

# Copy package.json files for dependency installation
COPY pnpm-workspace.yaml pnpm-lock.yaml package.json ./
COPY packages/backend/package.json ./packages/backend/package.json
COPY packages/frontend/package.json ./packages/frontend/package.json

# Install all dependencies with shamefully-hoist to avoid symlink issues
# This layer will be cached unless package.json or pnpm-lock.yaml changes
RUN --mount=type=cache,target=/root/.local/share/pnpm/store \
    pnpm install --frozen-lockfile --shamefully-hoist

# Copy all source code (after install to preserve cache)
# .dockerignore will exclude node_modules, .git, dist, etc.
COPY . .

# Build backend using root script
RUN pnpm run build:backend

# Note: pnpm prune has compatibility issues with --shamefully-hoist in monorepos
# Skipping prune - devDependencies will be included but won't affect runtime
# Image size impact: ~50-100MB (acceptable tradeoff for simplicity)
# If size becomes critical, consider 3-stage build with separate production install

# Stage 2: Runner
FROM node:22-alpine AS runner

WORKDIR /app

# Install wget for healthcheck
RUN apk add --no-cache wget

# Create non-root user
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nestjs

RUN mkdir -p logs && chown -R nestjs:nodejs logs

# Copy node_modules and built files from builder
COPY --from=builder --chown=nestjs:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=nestjs:nodejs /app/packages/backend/dist ./dist
COPY --from=builder --chown=nestjs:nodejs /app/packages/backend/package.json ./package.json

# Switch to non-root user
USER nestjs

# Expose backend port
EXPOSE 4000

# Start command (NestJS builds to dist/src/main.js)
CMD ["node", "dist/src/main.js"]
