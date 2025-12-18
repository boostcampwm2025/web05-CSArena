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

# Build frontend using root script
RUN pnpm run build:frontend

# Stage 2: Runner (Nginx)
FROM nginx:alpine AS runner

# Copy built files with proper permissions
COPY --from=builder --chown=nginx:nginx /app/packages/frontend/dist /usr/share/nginx/html

# Copy nginx configuration
COPY --chown=nginx:nginx packages/frontend/nginx.conf /etc/nginx/conf.d/default.conf

# Expose port 80
EXPOSE 80

# Nginx already runs as non-root user by default in alpine
# Start nginx
CMD ["nginx", "-g", "daemon off;"]
