// Prisma config for Prisma 7+
import "dotenv/config";
import { defineConfig } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    // SQLite database in prisma folder
    url: "file:./prisma/dev.db",
  },
});
