FROM node:24-alpine AS builder
WORKDIR /workspace
RUN corepack enable && corepack prepare pnpm@10.13.1 --activate
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/sync/package.json ./apps/sync/package.json
COPY packages/content/package.json ./packages/content/package.json
COPY packages/database/package.json ./packages/database/package.json
COPY packages/knowledge/package.json ./packages/knowledge/package.json
RUN pnpm install --filter @homepage/sync... --prod --frozen-lockfile --ignore-scripts
COPY apps/sync ./apps/sync
COPY packages/content ./packages/content
COPY packages/database ./packages/database
COPY packages/knowledge ./packages/knowledge
RUN pnpm --config.ignore-scripts=true --filter @homepage/sync deploy --prod --legacy /worker

FROM node:24-alpine
WORKDIR /app
COPY --from=builder --chown=node:node /worker ./
ENV NODE_ENV=production
USER node
HEALTHCHECK --interval=60s --timeout=15s --start-period=300s --retries=3 \
  CMD node --import tsx scripts/notion.ts health > /dev/null || exit 1
CMD ["node", "--import", "tsx", "scripts/knowledge.ts", "watch"]
