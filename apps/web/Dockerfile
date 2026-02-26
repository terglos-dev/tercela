FROM oven/bun:1 AS build
WORKDIR /app

COPY package.json bun.lock ./
COPY packages/shared ./packages/shared
COPY apps/web ./apps/web
RUN bun install --frozen-lockfile
RUN cd apps/web && bun run build

FROM node:22-alpine
WORKDIR /app
COPY --from=build /app/apps/web/.output .output
EXPOSE 3000
CMD ["node", ".output/server/index.mjs"]
