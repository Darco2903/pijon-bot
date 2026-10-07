import ClientWrapper from "./wrapper.js";
import { logger } from "./logger.js";
import { prisma } from "./prisma.js";
import { main } from "./main.js";
import { registerPeriodicTasks, stopPeriodicTasks } from "./periodics.js";

const wrapper: ClientWrapper = new ClientWrapper();
let isShuttingDown: boolean = false;

async function shutdown(signal: NodeJS.Signals) {
    if (isShuttingDown) return;
    isShuttingDown = true;
    logger.info(`Received ${signal}, shutting down...`);

    // Fallback if something keeps the process alive (docker stop kills after 10s anyway)
    setTimeout(() => {
        logger.warn("Shutdown timed out, forcing exit");
        process.exit(1);
    }, 8_000).unref();

    // Sequential: stop handling commands before closing the database they use.
    // stop() also works when the client never logged in (signal during startup).
    await stopPeriodicTasks();
    await wrapper.stop().catch((err) => logger.error(`Failed to stop the client: ${err}`));
    await prisma.disconnect();
}

(async () => {
    logger.info("Connecting to the database...");
    const prismaRes = await prisma
        .connect()
        .andTee(() => logger.info("Database connection established"))
        .orTee((err) => logger.error(`Database connection failed: ${err}`));

    if (prismaRes.isErr()) {
        logger.error("Failed to connect to the database, exiting...");
        process.exitCode = 1;
        return;
    }

    logger.info("Initializing the bot...");

    process.on("SIGINT", shutdown);
    process.on("SIGTERM", shutdown);

    const init = await main();
    if (init.isErr()) {
        logger.error(`Failed to initialize the bot: ${init.error}`);
        process.exitCode = 1;
        await prisma.disconnect();
        return;
    }

    registerPeriodicTasks();

    logger.info("Initialization complete, starting the client...");

    const wrRes = await wrapper.start();
    if (wrRes.isErr()) {
        logger.error(`Failed to start the client: ${wrRes.error}`);
        process.exitCode = 1;
        await Promise.allSettled([
            //
            stopPeriodicTasks(),
            prisma.disconnect(),
        ]);
        return;
    }

    const wr = wrRes.value;
    logger.info(`Logged in as ${wr.user.tag}`);

    logger.info("Client started successfully");
})();
