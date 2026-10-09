FROM ghcr.io/pnpm/pnpm:latest AS base
ENV CI=true
RUN pnpm runtime set node 24 -g
WORKDIR /app
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml /app/

FROM base AS prod-deps
RUN --mount=type=cache,id=pnpm,target=/pnpm/store pnpm install --prod --frozen-lockfile

FROM base AS build
RUN --mount=type=cache,id=pnpm,target=/pnpm/store pnpm install --frozen-lockfile
COPY src/ /app/src/
COPY tsconfig.json /app/
COPY prisma/schema.prisma /app/prisma/
RUN pnpm build

FROM node:24-slim AS migrate
WORKDIR /app
# only what prisma.config.ts imports: prisma (CLI + prisma/config) and dotenv
RUN npm install --no-save --no-package-lock prisma@7.10.0 dotenv@18
COPY prisma/ ./prisma/
COPY prisma.config.ts ./
CMD ["npx", "prisma", "migrate", "deploy"]

FROM node:24-slim AS runtime
WORKDIR /app
# yt-dlp (zipapp, needs python3) and ffmpeg for some formats; node is reused as its JS runtime
RUN apt-get update && apt-get install -y --no-install-recommends python3 ffmpeg ca-certificates \
    && rm -rf /var/lib/apt/lists/*
ADD --chmod=755 https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp /usr/local/bin/yt-dlp
# node_modules
COPY --from=prod-deps /app/node_modules /app/node_modules
# dist
COPY --from=build /app/dist /app/dist
COPY --from=build /app/package.json /app/

CMD ["node", "."]
