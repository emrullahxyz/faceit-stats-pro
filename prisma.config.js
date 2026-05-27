// Prisma config for Prisma 7+ (JavaScript version for Docker compatibility)
module.exports = {
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    // SQLite database path loaded dynamically from environment
    url: process.env.DATABASE_URL || "file:./prisma/dev.db",
  },
};
