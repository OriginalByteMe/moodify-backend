# syntax = docker/dockerfile:1

# Adjust NODE_VERSION as desired
ARG NODE_VERSION=22.15.0
FROM node:${NODE_VERSION}-slim AS base

LABEL fly_launch_runtime="Node.js"

# Node.js app lives here
WORKDIR /app

# Default to production, can be overridden at build time
ARG NODE_ENV="production"
ENV NODE_ENV=${NODE_ENV}

# Install only Node deps in a cached layer, then copy app code.
# This avoids slow apt-get and speeds up rebuilds.

# Dependencies layer (cached when package files unchanged)
FROM base AS deps
COPY package-lock.json package.json ./
# Use BuildKit cache for npm to speed up repeat builds
RUN --mount=type=cache,target=/root/.npm \
    if [ "$NODE_ENV" = "production" ]; then \
      npm ci --omit=dev --no-audit --no-fund; \
    else \
      npm ci --include=dev --no-audit --no-fund; \
    fi

# Application layer
FROM base AS app
COPY --from=deps /app/node_modules /app/node_modules
COPY . .

# Runtime image
FROM base
COPY --from=app /app /app

# Start the server by default, this can be overwritten at runtime
EXPOSE 5050
CMD [ "npm", "run", "start" ]
