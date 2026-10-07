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

export type PrismaErrorResult =
    | Prisma.PrismaClientRustPanicError
    | Prisma.PrismaClientValidationError
    | Prisma.PrismaClientKnownRequestError
    | Prisma.PrismaClientInitializationError
    | Prisma.PrismaClientUnknownRequestError
    | Error;

function safe<T>(promise: Promise<T>): ResultAsync<T, PrismaErrorResult> {
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
}

function checkConnection(): ResultAsync<void, String> {
    return safe(prisma.$queryRawUnsafe("SELECT 1"))
        .map(() => undefined)
        .mapErr((err) => err.message);
}

const ext = Prisma.defineExtension((prisma) =>
    prisma.$extends({
        client: {
            checkConnection: checkConnection,
            connect: (): ResultAsync<void, String> => {
                return safe(prisma.$connect())
                    .mapErr((err) => err.message)
                    .andThen(() => checkConnection())
                    .andTee(() => {
                        logger.info("Connected to the database");
                    });
            },
            disconnect: (): ResultAsync<void, String> => {
                return safe(prisma.$disconnect())
                    .mapErr((err) => err.message)
                    .andTee(() => {
                        logger.info("Disconnected from the database");
                    });
            },
            safe: safe,
        },
    }),
);

export const prisma = new PrismaClient({ adapter }).$extends(ext);
