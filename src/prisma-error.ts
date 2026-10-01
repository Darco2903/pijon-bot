// prisma-error.ts
// Documentation officielle : https://www.prisma.io/docs/orm/reference/error-reference

export enum PrismaError {
    /**
     * The record searched for in the where condition does not exist.
     */
    RecordDoesNotExist = "P2001",
    /**
     * A unique constraint failed, e.g. duplicate email.
     */
    UniqueConstraintFailed = "P2002",

    /**
     * Foreign key constraint failed on the field.
     */
    ForeignKeyConstraintFailed = "P2003",

    /**
     * Record not found for an update/delete/findUniqueOrThrow.
     */
    RecordNotFound = "P2025",

    /**
     * The value provided for a column is too long.
     */
    ValueTooLong = "P2000",

    /**
     * Invalid value stored in the database for a given type.
     */
    InvalidValue = "P2005",

    /**
     * Query interpretation error (e.g. invalid filter conditions).
     */
    QueryInterpretationError = "P2010",

    /**
     * Missing required value for a field.
     */
    MissingRequiredValue = "P2011",

    /**
     * Null constraint violation.
     */
    NullConstraintViolation = "P2014",

    /**
     * Failed to connect to the database.
     */
    DatabaseConnectionError = "P1001",

    /**
     * The database server does not exist or cannot be reached.
     */
    DatabaseDoesNotExist = "P1003",

    /**
     * Authentication failed when connecting to the database.
     */
    DatabaseAccessDenied = "P1008",

    /**
     * The database connection was closed unexpectedly.
     */
    DatabaseConnectionClosed = "P1009",

    /**
     * Timeout reached while trying to connect to the database.
     */
    DatabaseTimeout = "P1010",

    /**
     * A constraint failed due to incorrect relation usage.
     */
    RelationViolation = "P2014",

    /**
     * A table, view or field does not exist in the database.
     */
    TableOrFieldDoesNotExist = "P2019",

    /**
     * The provided arguments are invalid.
     */
    InvalidArguments = "P2016",

    /**
     * A migration or query failed to execute properly.
     */
    QueryExecutionFailed = "P2020",

    /**
     * The database version is not supported by Prisma.
     */
    UnsupportedDatabaseVersion = "P3001",
}
