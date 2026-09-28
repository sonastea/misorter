import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/profiling",
  testMatch: "**/*.pw.ts",
  workers: 1,
  use: { baseURL: "http://127.0.0.1:4175", headless: true },
  webServer: {
    command:
      "bunx vite preview --config scripts/profile.config.ts --host 127.0.0.1 --port 4175",
    url: "http://127.0.0.1:4175",
    reuseExistingServer: false,
  },
});
