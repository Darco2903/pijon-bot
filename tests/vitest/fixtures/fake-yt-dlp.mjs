#!/usr/bin/env node
// Stands in for yt-dlp. Behavior comes from env vars set by the test:
// FAKE_YTDLP_STDOUT, FAKE_YTDLP_STDERR, FAKE_YTDLP_EXIT (default 0),
// FAKE_YTDLP_DELAY_MS (wait before exiting), FAKE_YTDLP_ARGS_FILE (argv is written there as JSON).
import fs from "fs";

const env = process.env;

if (env.FAKE_YTDLP_ARGS_FILE) {
    fs.writeFileSync(env.FAKE_YTDLP_ARGS_FILE, JSON.stringify(process.argv.slice(2)));
}
if (env.FAKE_YTDLP_STDERR) process.stderr.write(env.FAKE_YTDLP_STDERR);
if (env.FAKE_YTDLP_STDOUT) process.stdout.write(env.FAKE_YTDLP_STDOUT);

setTimeout(
    () => process.exit(Number(env.FAKE_YTDLP_EXIT ?? 0)),
    Number(env.FAKE_YTDLP_DELAY_MS ?? 0),
);
