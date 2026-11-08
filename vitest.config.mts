import path from "node:path";
import nextEnv from "@next/env";
import { defineConfig } from "vitest/config";

const { combinedEnv } = nextEnv.loadEnvConfig(process.cwd());

export default defineConfig({
  resolve: { alias: { "@": path.resolve(import.meta.dirname, "src") } },
  test: {
    include: ["src/**/*.test.ts", "tests/**/*.test.ts"],
    globalSetup: ["tests/global-setup.ts"],
    env: combinedEnv as Record<string, string>,
    // Integration tests share one database.
    fileParallelism: false,
  },
});
