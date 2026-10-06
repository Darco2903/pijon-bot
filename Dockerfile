FROM ghcr.io/pnpm/pnpm:latest AS base
ENV CI=true
RUN pnpm runtime set node 24 -g
WORKDIR /app
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./

FROM base AS prod-deps
RUN --mount=type=cache,id=pnpm,target=/pnpm/store pnpm install --prod --frozen-lockfile

FROM base AS build
RUN --mount=type=cache,id=pnpm,target=/pnpm/store pnpm install --frozen-lockfile
COPY src/ /app/src/
COPY tsconfig.json ./
COPY prisma/schema.prisma ./prisma/
RUN pnpm build

FROM node:24-alpine AS runtime
# yt-dlp (zipapp, needs python3) and ffmpeg for some formats; node is reused as its JS runtime
RUN apk add --no-cache python3 ffmpeg
ADD --chmod=755 https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp /usr/local/bin/yt-dlp
# node_modules
COPY --from=prod-deps /app/node_modules /app/node_modules
# dist
COPY --from=build /app/dist /app/dist
COPY --from=build /app/package.json /app/
WORKDIR /app

CMD ["node", "."]
