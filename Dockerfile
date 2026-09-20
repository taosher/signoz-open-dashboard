# Single-image multi-stage build (design doc §9): web build -> api build -> node runtime.
FROM node:20-slim AS webbuild
WORKDIR /app
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml tsconfig.base.json ./
COPY apps/web/package.json apps/web/package.json
COPY apps/api/package.json apps/api/package.json
COPY packages/shared/package.json packages/shared/package.json
RUN corepack enable && corepack prepare pnpm@9.0.0 --activate || npm i -g pnpm@9.0.0
RUN pnpm install --frozen-lockfile --filter @signoz-open-dashboard/web...
COPY packages/shared ./packages/shared
COPY apps/web ./apps/web
RUN pnpm --filter @signoz-open-dashboard/web build

FROM node:20-slim AS apibuild
WORKDIR /app
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml tsconfig.base.json ./
COPY apps/api/package.json apps/api/package.json
COPY apps/web/package.json apps/web/package.json
COPY packages/shared/package.json packages/shared/package.json
RUN corepack enable && corepack prepare pnpm@9.0.0 --activate || npm i -g pnpm@9.0.0
RUN pnpm install --frozen-lockfile --filter @signoz-open-dashboard/api...
COPY packages/shared ./packages/shared
COPY apps/api ./apps/api
RUN pnpm --filter @signoz-open-dashboard/shared build
RUN pnpm --filter @signoz-open-dashboard/api build
RUN pnpm --filter @signoz-open-dashboard/api deploy --prod /out \
  && mkdir -p /out/node_modules/@signoz-open-dashboard \
  && cp -R packages/shared /out/node_modules/@signoz-open-dashboard/shared \
  && rm -rf /out/node_modules/@signoz-open-dashboard/shared/node_modules

FROM node:20-slim AS runtime
ENV NODE_ENV=production
ENV PORT=8080
WORKDIR /app
COPY --from=apibuild /out ./
COPY --from=webbuild /app/apps/web/dist ./web-dist
EXPOSE 8080
CMD ["node", "dist/main.js"]
