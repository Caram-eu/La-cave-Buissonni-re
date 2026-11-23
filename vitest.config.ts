import { defineConfig } from "vitest/config";
import path from "node:path";

const alias = { "@": path.resolve(__dirname, "src"), "server-only": path.resolve(__dirname, "tests/server-only.ts") };

export default defineConfig({
  resolve: { alias },
  test: {
    fileParallelism: false,
    projects: [
      { resolve: { alias }, test: { name: "unit", include: ["tests/unit/**/*.test.ts"], environment: "node" } },
      {
        resolve: { alias },
        test: {
          name: "integration",
          include: ["tests/integration/**/*.test.ts"],
          environment: "node",
          globalSetup: ["tests/integration/setup.ts"],
          env: { DATABASE_URL: process.env.TEST_DATABASE_URL || "postgresql://postgres:postgres@localhost:5432/cave_test" },
        },
      },
    ],
  },
});
