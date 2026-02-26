FROM oven/bun:1 AS base
WORKDIR /app

# Copia workspace root + shared + api
COPY package.json bun.lock ./
COPY packages/shared ./packages/shared
COPY apps/api ./apps/api
RUN bun install --frozen-lockfile

# Runtime
FROM oven/bun:1-slim
WORKDIR /app
COPY --from=base /app .
EXPOSE 3333
CMD ["bun", "run", "apps/api/src/index.ts"]
