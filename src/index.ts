import ClientWrapper from "./wrapper.js";
import { logger } from "./logger.js";
import { prisma } from "./prisma.js";
import { main } from "./main.js";

let wrapper: ClientWrapper<true>;

logger.info("Connecting to the database...");
await prisma
    .safe(prisma.$connect())
    .andThen(() => prisma.checkConnection())
    .andTee(() => logger.info("Database connection established"))
    .orElse((err) => {
        logger.error("Database connection failed");
        logger.error(err);
        process.exit(1);
    })
    .andTee(() => {
        logger.info("Starting the client...");

        new ClientWrapper()
            .start()
            .then(async (wr) => {
                wrapper = wr;
                logger.info(`Logged in as ${wrapper.user.tag}`);
                await main(wrapper);
                logger.info("Client started successfully");
            })
            .catch((error) => {
                logger.error("Error starting the client:", error);
                process.exit(1);
            });
    });

process.on("SIGINT", async () => {
    if (wrapper) {
        await wrapper.stop();
        await prisma.$disconnect();
        logger.info("Disconnected from the database");
    }
    process.exit(0);
});
