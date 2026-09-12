import { defineConfig, devices } from "@playwright/test";
export default defineConfig({
  testDir: "./e2e", fullyParallel: true, retries: 0,
  testIgnore: ["**/offline.spec.ts", "**/startup.spec.ts"],
  use: { baseURL: "http://127.0.0.1:3100", trace: "retain-on-failure" },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: { command: "npm run dev", url: "http://127.0.0.1:3100/api/health", env: { PORT: "3100", DISABLE_HMR: "true" }, reuseExistingServer: false, timeout: 60000 },
});
