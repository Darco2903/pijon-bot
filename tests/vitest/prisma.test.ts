import { describe, expect, it } from "vitest";
// Same module as "#prisma7/client" (aliased in vitest.config.ts), so instanceof works
import { Prisma } from "../../src/generated/prisma/client.js";
import { prisma } from "../../src/prisma.js";

const clientVersion = "7.10.0";

describe("prisma.safe", () => {
    it("wraps a resolved query in ok", async () => {
        const res = await prisma.safe(Promise.resolve([{ id: 1 }]));

        expect(res._unsafeUnwrap()).toEqual([{ id: 1 }]);
    });

    it("passes known request errors through", async () => {
        const error = new Prisma.PrismaClientKnownRequestError("Unique constraint failed", {
            code: "P2002",
            clientVersion,
        });

        const res = await prisma.safe(Promise.reject(error));

        expect(res._unsafeUnwrapErr()).toBe(error);
    });

    it("passes validation errors through", async () => {
        const error = new Prisma.PrismaClientValidationError("Invalid argument", {
            clientVersion,
        });

        const res = await prisma.safe(Promise.reject(error));

        expect(res._unsafeUnwrapErr()).toBe(error);
    });

    it("passes initialization errors through", async () => {
        const error = new Prisma.PrismaClientInitializationError(
            "Can't reach database",
            clientVersion,
        );

        const res = await prisma.safe(Promise.reject(error));

        expect(res._unsafeUnwrapErr()).toBe(error);
    });

    it("hides anything else behind a generic error", async () => {
        const res = await prisma.safe(Promise.reject(new TypeError("something internal")));

        const error = res._unsafeUnwrapErr();
        expect(error).toBeInstanceOf(Error);
        expect(error.message).toBe("Unknown Prisma error");
    });
});
