import { defineConfig, devices } from "@playwright/test";
export default defineConfig({
  testDir: "./e2e", testMatch: ["offline.spec.ts", "startup.spec.ts"], timeout: 60000,
  use: { ...devices["Desktop Chrome"], baseURL: "http://127.0.0.1:3200", trace: "retain-on-failure" },
  webServer: { command: "npm start", url: "http://127.0.0.1:3200/api/health", env: { PORT: "3200" }, reuseExistingServer: false },
});
