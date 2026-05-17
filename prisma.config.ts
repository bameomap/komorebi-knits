import path from "node:path";
import { defineConfig } from "prisma/config";

const __dirname = path.dirname(new URL(import.meta.url).pathname);

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    url: `file:${path.join(__dirname, "prisma", "knitting.db")}`,
  },
});
