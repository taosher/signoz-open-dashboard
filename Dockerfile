# 单镜像多阶段构建（设计文档 §9）：web 占位 → api 构建 → node runtime。
FROM node:20-slim AS webbuild
WORKDIR /app
COPY package.json pnpm-workspace.yaml ./
COPY apps/web/package.json apps/web/package.json
COPY packages/shared/package.json packages/shared/package.json
RUN corepack enable && corepack prepare pnpm@9.0.0 --activate || npm i -g pnpm@9.0.0
RUN pnpm --filter @signoz-open-dashboard/web... install --no-frozen-lockfile || true
COPY apps/web ./apps/web
RUN pnpm --filter @signoz-open-dashboard/web build || (mkdir -p apps/web/dist && echo placeholder > apps/web/dist/index.html)

FROM node:20-slim AS apibuild
WORKDIR /app
COPY package.json pnpm-workspace.yaml tsconfig.base.json ./
COPY apps/api ./apps/api
COPY packages/shared ./packages/shared
RUN corepack enable && corepack prepare pnpm@9.0.0 --activate || npm i -g pnpm@9.0.0
RUN pnpm --filter @signoz-open-dashboard/api... install --no-frozen-lockfile
RUN pnpm --filter @signoz-open-dashboard/shared build
RUN pnpm --filter @signoz-open-dashboard/api build

FROM node:20-slim AS runtime
ENV NODE_ENV=production
ENV PORT=8080
WORKDIR /app
COPY --from=apibuild /app/apps/api/dist ./dist
COPY --from=apibuild /app/apps/api/package.json ./package.json
COPY --from=apibuild /app/node_modules ./node_modules
COPY --from=webbuild /app/apps/web/dist ./web-dist
EXPOSE 8080
CMD ["node", "dist/main.js"]
