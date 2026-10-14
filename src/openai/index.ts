import type { APIPromise } from "openai";
import { ResultAsync } from "neverthrow";

export function safeCall<T>(call: APIPromise<T>, what: string): ResultAsync<T, string> {
    return ResultAsync.fromPromise(
        call,
        (error) => `${what} failed: ${error instanceof Error ? error.message : String(error)}`,
    );
}
