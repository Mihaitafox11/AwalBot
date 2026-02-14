FROM node:20-slim

RUN npm install -g pnpm@10

WORKDIR /app

# Copy workspace config
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml turbo.json tsconfig.base.json ./

# Copy shared package
COPY packages/shared ./packages/shared

# Copy relay
COPY apps/relay ./apps/relay

# Install deps
RUN pnpm install --frozen-lockfile

# Build shared first, then relay
RUN pnpm --filter @awalbot/shared build

CMD ["npx", "tsx", "apps/relay/src/index.ts"]
