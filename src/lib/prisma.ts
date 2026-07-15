import { PrismaClient } from "@prisma/client";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";

const globalForPrisma = globalThis as unknown as {
    prisma: PrismaClient | undefined;
};

// Prisma 7 requires a driver adapter for SQLite. Only honor DATABASE_URL when
// it is actually a SQLite URL (the checked-in .env carries a leftover
// prisma+postgres template value); otherwise fall back to the same default
// path used by prisma.config.js.
const databaseUrl = process.env.DATABASE_URL?.startsWith("file:")
    ? process.env.DATABASE_URL
    : "file:./prisma/dev.db";

export const prisma =
    globalForPrisma.prisma ??
    new PrismaClient({
        adapter: new PrismaBetterSqlite3({ url: databaseUrl }),
        log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
    });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
