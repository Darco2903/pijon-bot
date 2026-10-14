import path from "path";
import { defineConfig } from "vitest/config";

export default defineConfig({
    resolve: {
        alias: {
            // package.json "imports" point to dist/, tests run on the sources
            "#prisma7/client": path.resolve("src/generated/prisma/client.ts"),
            "#prisma7/error": path.resolve("src/prisma-error.ts"),
        },
    },
    test: {
        include: ["tests/vitest/**/*.test.ts"],
        // mocks config.js and logger.js for every test file
        setupFiles: ["tests/vitest/setup.ts"],
        // child processes (fake yt-dlp) and process.chdir need real processes
        pool: "forks",
        restoreMocks: true,
    },
});
