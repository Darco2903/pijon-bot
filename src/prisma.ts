import { PrismaMariaDb } from "@prisma/adapter-mariadb";
import { Prisma, PrismaClient } from "#prisma7/client";
import { ResultAsync } from "neverthrow";
import { logger } from "./logger.js";
import { config } from "./config.js";

const adapter = new PrismaMariaDb({
    host: config.database.host,
    user: config.database.user,
    password: config.database.password,
    database: config.database.name,
    connectionLimit: 5,
    logger: {
        // error: (msg) => logger.error(msg),
        // network: (msg) => logger.warn(msg),
        // query: (msg) => logger.info(msg),
    },
});

// const ENC_KEY = Buffer.from(config.database.key, "base64"); // 32 bytes

export type PrismaErrorResult =
    | Prisma.PrismaClientRustPanicError
    | Prisma.PrismaClientValidationError
    | Prisma.PrismaClientKnownRequestError
    | Prisma.PrismaClientInitializationError
    | Prisma.PrismaClientUnknownRequestError
    | Error;

const ext = Prisma.defineExtension((prisma) =>
    prisma.$extends({
        client: {
            checkConnection: (): ResultAsync<void, String> => {
                return ResultAsync.fromPromise(prisma.$queryRawUnsafe("SELECT 1"), (e) =>
                    String(e),
                );
            },
            safe: <T>(promise: Promise<T>): ResultAsync<T, PrismaErrorResult> => {
                return ResultAsync.fromPromise(promise, (e) => {
                    if (
                        e instanceof Prisma.PrismaClientKnownRequestError
                        || e instanceof Prisma.PrismaClientRustPanicError
                        || e instanceof Prisma.PrismaClientValidationError
                        || e instanceof Prisma.PrismaClientInitializationError
                        || e instanceof Prisma.PrismaClientUnknownRequestError
                    )
                        return e;
                    return new Error("Unknown Prisma error");
                });
            },
            // getKey: () => ENC_KEY,
        },
    }),
);

export const prisma = new PrismaClient({ adapter }).$extends(ext);
