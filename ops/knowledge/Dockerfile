FROM node:24-alpine
WORKDIR /app
RUN corepack enable && corepack prepare pnpm@10.13.1 --activate
COPY package.json pnpm-lock.yaml ./
# Use the app's lockfile so the indexer and Vercel share identical database/provider dependencies.
RUN pnpm install --frozen-lockfile --ignore-scripts --prod=false
COPY tsconfig.json ./
COPY scripts/knowledge.ts ./scripts/knowledge.ts
COPY src/lib ./src/lib
COPY src/data ./src/data
COPY src/server/knowledge ./src/server/knowledge
COPY src/server/notion ./src/server/notion
COPY ops/knowledge/001-initial.sql ./ops/knowledge/001-initial.sql
ENV NODE_ENV=production
USER node
HEALTHCHECK --interval=60s --timeout=15s --start-period=120s --retries=3 \
  CMD node --import tsx scripts/knowledge.ts status > /dev/null || exit 1
CMD ["node", "--import", "tsx", "scripts/knowledge.ts", "watch"]
