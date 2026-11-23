import { execSync } from "node:child_process";
import { PrismaClient } from "@prisma/client";

const TEST_DB = process.env.TEST_DATABASE_URL || "postgresql://postgres:postgres@localhost:5432/cave_test";

/** Prépare la base de TEST (jamais la base du site) : schéma à jour, tables vidées, carte rechargée. */
export default async function setup() {
  if (!/_test\b|_test\?|_test$/.test(new URL(TEST_DB).pathname)) throw new Error("La base de test doit avoir un nom finissant par _test");
  const env = { ...process.env, DATABASE_URL: TEST_DB };
  execSync("npx prisma migrate deploy", { env, stdio: "ignore" });
  const db = new PrismaClient({ datasources: { db: { url: TEST_DB } } });
  const tables = await db.$queryRaw<{ tablename: string }[]>`SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND tablename <> '_prisma_migrations'`;
  await db.$executeRawUnsafe(`TRUNCATE ${tables.map((t) => `"${t.tablename}"`).join(", ")} CASCADE`);
  await db.$disconnect();
  execSync("npx tsx prisma/seed.ts", { env, stdio: "ignore" });
}
