# syntax=docker/dockerfile:1

ARG NODE_VERSION=24

# ---- base: Node with pnpm (version taken from package.json#packageManager) ----
FROM node:${NODE_VERSION}-alpine AS base
ENV PNPM_HOME=/pnpm \
    PATH=/pnpm:$PATH \
    COREPACK_ENABLE_DOWNLOAD_PROMPT=0 \
    CI=true
RUN corepack enable
WORKDIR /app

# ---- deps: install from the lockfile; cached until the manifests change ----
FROM base AS deps
COPY package.json pnpm-lock.yaml ./
RUN --mount=type=cache,id=pnpm-store,target=/pnpm/store \
    pnpm install --frozen-lockfile --ignore-scripts

# ---- build: compile the static site ----
FROM deps AS build
ARG BASE_PATH=/
ENV BASE_PATH=${BASE_PATH}
COPY . .
RUN pnpm build

# ---- runtime: unprivileged nginx serving static files on :8080 ----
FROM nginxinc/nginx-unprivileged:stable-alpine AS runtime
LABEL org.opencontainers.image.title="Homebody" \
      org.opencontainers.image.description="Home workout planner and load calculator" \
      org.opencontainers.image.source="https://github.com/khoren93/homebody" \
      org.opencontainers.image.licenses="MIT"
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 8080
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget -q --spider http://127.0.0.1:8080/healthz || exit 1
