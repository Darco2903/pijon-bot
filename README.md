# Pijon-Bot

Discord bot for the **Lé Pijons** Discord server, written in TypeScript.

> [!NOTE]
> **v3 is in development.** The bot is being rewritten from scratch in TypeScript on top of [discord.js v14](https://discord.js.org/).

## Features

- **Music player**: plays YouTube tracks in voice channels through [yt-dlp](https://github.com/yt-dlp/yt-dlp) and ffmpeg
    - Search by name, URL or video ID, with autocomplete that suggests recently played tracks
    - Per-server queue, saved on shutdown and restored on startup
    - On-disk audio cache with size and age limits, pruned every hour
    - Leaves the voice channel after 2 minutes alone
- **Self-maintenance**: yt-dlp updates itself on startup and every 12 hours

## Commands

| Command     | Options                       | Description                           |
| ----------- | ----------------------------- | ------------------------------------- |
| `/play`     | `query`, `channel` (optional) | Plays a song, or adds it to the queue |
| `/pause`    |                               | Pauses the current song               |
| `/resume`   |                               | Resumes the current song              |
| `/next`     |                               | Plays the next song in the queue      |
| `/previous` |                               | Plays the previous song in the queue  |
| `/seek`     | `time` (seconds)              | Seeks to a time in the current song   |
| `/stop`     |                               | Stops the music and clears the queue  |
| `/join`     | `channel` (optional)          | Joins a voice channel                 |
| `/leave`    |                               | Leaves the voice channel              |

## Requirements

- [**Node.js**](https://nodejs.org/en/) v24 or newer
- [**pnpm**](https://pnpm.io/)
- [**yt-dlp**](https://github.com/yt-dlp/yt-dlp) and [**ffmpeg**](https://ffmpeg.org/) in your `PATH`
- A **MySQL** (or MariaDB) server
- A [Discord application](https://discord.com/developers/applications) with a bot token

<!-- - API keys for [Fish Audio](https://fish.audio/) and [OpenAI](https://platform.openai.com/) (required at startup) -->

With Docker, you only need [Docker](https://www.docker.com/) and Docker Compose: the image ships Node.js, yt-dlp and ffmpeg, and the compose file starts a MySQL server and runs the database migrations.

## Configuration

The bot reads secrets from `.env` and everything else from `config.json`. It checks both on startup and exits with an error if anything is missing.

### `.env`

```bash
cp .env.example .env
```

| Variable                 | Description                                                                |
| ------------------------ | -------------------------------------------------------------------------- |
| `DATABASE_HOST`          | MySQL host (`mysql-db` when using compose)                                 |
| `DATABASE_PORT`          | MySQL port, used by the Prisma CLI and published by compose on `127.0.0.1` |
| `DATABASE_USER`          | MySQL user (not `root` when using compose)                                 |
| `DATABASE_PASSWORD`      | MySQL password                                                             |
| `DATABASE_NAME`          | Database name                                                              |
| `DATABASE_ROOT_PASSWORD` | MySQL root password, only used by compose                                  |
| `DISCORD_TOKEN`          | Bot token                                                                  |
| `DISCORD_CLIENT_ID`      | Application ID, used to deploy slash commands                              |

<!-- | `FISH_AUDIO_API_KEY` | Fish Audio API key                            | -->
<!-- | `OPENAI_API_KEY`     | OpenAI API key                                | -->

### `config.json`

```bash
cp config.example.json config.json
```

Then **remove the `//` comments** (the file is parsed as plain JSON) and fill in the values:

| Key                              | Description                                                                |
| -------------------------------- | -------------------------------------------------------------------------- |
| `musicplayer.cache.path`         | Folder for cached audio files                                              |
| `musicplayer.cache.maxSize`      | Max size of the whole cache in bytes, `0` = no limit                       |
| `musicplayer.cache.maxFileSize`  | Max size of one cached track in bytes, `0` = no limit                      |
| `musicplayer.cache.maxAge`       | Seconds since a track was last played before it is removed, `0` = no limit |
| `musicplayer.queue_save.enabled` | Save queues on shutdown and restore them on startup                        |
| `musicplayer.queue_save.path`    | File the queues are saved to                                               |
| `ytdlp.cookie_file`              | YouTube cookies file passed to yt-dlp (optional)                           |

When running with Docker, `./data` is mounted at `/app/data`, so use paths such as `data/cache`, `data/queue.json` and `data/cookies.txt`.

> [!TIP]
> See the [yt-dlp FAQ](https://github.com/yt-dlp/yt-dlp/wiki/FAQ#how-do-i-pass-cookies-to-yt-dlp) for how to export YouTube cookies.

### Database

The schema lives in [`prisma/schema.prisma`](prisma/schema.prisma) and is versioned as [Prisma migrations](prisma/migrations). To create or update the tables in an existing database:

```bash
pnpm exec prisma migrate deploy
```

With Docker, the `migrate` service does this automatically before the bot starts. A plain SQL version of the schema is also available in [`prisma/db.sql`](prisma/db.sql).

## Running locally

1. Clone the repository and install dependencies

    ```bash
    git clone https://github.com/Darco2903/pijon-bot.git
    cd pijon-bot
    pnpm install
    ```

2. Set up `.env`, `config.json` and the database (see [Configuration](#configuration))

3. Build the project (generates the Prisma client, then compiles TypeScript)

    ```bash
    pnpm build
    ```

4. Register the slash commands with Discord (once, and again whenever commands change)

    ```bash
    pnpm run deploy
    ```

    > [!WARNING]
    > Use `pnpm run deploy`, not `pnpm deploy`: the latter is a built-in pnpm command.

5. Start the bot

    ```bash
    pnpm start   # production
    pnpm dev     # development: runs from source with debug logs
    ```

## Running with Docker

1. Set up `.env` and `config.json` (see [Configuration](#configuration)), with `DATABASE_HOST=mysql-db` and `DATABASE_PORT=3306`

    Compose uses the `DATABASE_*` variables to create the MySQL user and database on first start.

2. Start everything

    ```bash
    docker compose up -d --build
    ```

    This starts MySQL, waits until it is healthy, applies the migrations, then starts the bot.

3. Register the slash commands

    ```bash
    docker compose exec pijon-bot node dist/tools/deploy-commands.js
    ```

> [!NOTE]
> MySQL only reads the `DATABASE_*` variables when its volume is empty. To change the user or password afterwards, update them in MySQL or remove the volume with `docker compose down -v` (this deletes the data).

## Development

| Script            | Description                                               |
| ----------------- | --------------------------------------------------------- |
| `pnpm dev`        | Run from source with `tsx` and debug logs                 |
| `pnpm build`      | Generate the Prisma client and compile to `dist`          |
| `pnpm check`      | Typecheck without emitting                                |
| `pnpm test`       | Run tests with Vitest                                     |
| `pnpm test:watch` | Run tests in watch mode                                   |
| `pnpm db:pull`    | Pull the database schema into `schema.prisma`             |
| `pnpm db:push`    | Push `schema.prisma` to the database, without a migration |
| `pnpm clean`      | Remove `dist` and generated files                         |

CI typechecks and tests every push to `dev` and every pull request to `main`, and checks that the Docker image builds.
