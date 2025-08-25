# syntax = docker/dockerfile:1

# Adjust NODE_VERSION as desired
ARG NODE_VERSION=22.14.0
FROM node:${NODE_VERSION}-slim AS base

LABEL fly_launch_runtime="Node.js"

# Node.js app lives here
WORKDIR /app

# Default to production, can be overridden at build time
ARG NODE_ENV="production"
ENV NODE_ENV=${NODE_ENV}

# Throw-away build stage to reduce size of final image
FROM base AS build

# Install packages needed to build node modules
RUN apt-get update -qq && \
    apt-get install --no-install-recommends -y build-essential node-gyp pkg-config python-is-python3

# Copy package files
COPY package-lock.json package.json ./

# Install dependencies (with or without dev dependencies based on NODE_ENV)
RUN if [ "$NODE_ENV" = "production" ] ; then npm ci ; else npm ci --include=dev ; fi

# Copy application code
COPY . .


# Final stage for app image
FROM base

# Copy built application
COPY --from=build /app /app

# Start the server by default, this can be overwritten at runtime
EXPOSE 3000
CMD [ "npm", "run", "start" ]
