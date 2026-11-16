FROM node:24-alpine
WORKDIR /app
RUN corepack enable && corepack prepare pnpm@10.13.1 --activate
COPY package.json pnpm-lock.yaml ./
# Use the app's lockfile so the indexer and Vercel share identical database/provider dependencies.
RUN pnpm install --frozen-lockfile --ignore-scripts --prod=false
COPY tsconfig.json ./
COPY scripts/knowledge.ts ./scripts/knowledge.ts
COPY scripts/notion.ts ./scripts/notion.ts
COPY src/lib ./src/lib
COPY src/data ./src/data
COPY src/server ./src/server
COPY src/utils ./src/utils
COPY public/img ./public/img
COPY ops/knowledge/001-initial.sql ops/knowledge/003-notion-resilience.sql ./ops/knowledge/
ENV NODE_ENV=production
USER node
HEALTHCHECK --interval=60s --timeout=15s --start-period=300s --retries=3 \
  CMD node --import tsx scripts/notion.ts health > /dev/null || exit 1
CMD ["node", "--import", "tsx", "scripts/knowledge.ts", "watch"]
