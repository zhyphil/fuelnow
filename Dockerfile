# Build and smoke-test before promoting the resulting immutable image digest.
FROM node:24-bookworm-slim@sha256:ba849c60be29959425b8734d57b8b4b7d56f98edd9504c9af091d5281095a71e AS dependencies
WORKDIR /app
RUN npm install --global pnpm@10.28.2
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/api/package.json apps/api/package.json
COPY packages/config/package.json packages/config/package.json
COPY packages/contracts/package.json packages/contracts/package.json
COPY packages/data-core/package.json packages/data-core/package.json
RUN pnpm install --frozen-lockfile --prod --ignore-scripts --filter @fuel-now/api...

FROM node:24-bookworm-slim@sha256:ba849c60be29959425b8734d57b8b4b7d56f98edd9504c9af091d5281095a71e AS runtime
ENV NODE_ENV=production APP_ENV=production API_HOST=0.0.0.0 API_PORT=3000 \
    MAPBOX_MONTHLY_ELEMENT_BUDGET=0 TSX_DISABLE_CACHE=1
WORKDIR /app
COPY --from=dependencies /app/ /app/
COPY apps/api/src apps/api/src
COPY packages/config/src packages/config/src
COPY packages/contracts/src packages/contracts/src
COPY packages/data-core/src packages/data-core/src
WORKDIR /app/apps/api
USER node
EXPOSE 3000
CMD ["node", "--import", "tsx", "src/api/start.ts"]
